-- Per-step quiz analytics: one row per screen the visitor sees or answers.
--
-- WHY THIS EXISTS
-- `landing_quiz_submissions` only gets written at the email step (31 of 33), so
-- everyone who leaves earlier is invisible — we currently cannot answer "which
-- question loses people", which is the whole question the funnel needs answered.
-- GA4 has the events but not the raw rows, is sampled, and cannot be joined to
-- `subscriptions` to ask "which answers predict a purchase".
--
-- SHAPE: append-only event log, NOT an updated profile row.
--   * keeps the history — re-answers, back-navigation and time-per-step survive,
--     all of which are exactly the drop-off signal we're after;
--   * no read-modify-write, so concurrent steps can't clobber each other;
--   * cheap to write, and the "current profile" is a view over it (see below).
--
-- IDENTITY: anon_id is the join key and is present from the FIRST landing hit,
-- long before an email exists. That is what makes abandoned sessions analysable.
-- email is backfilled onto earlier rows once the visitor reaches the email step.
--
-- The question TEXT is stored with every answer on purpose: quiz copy changes
-- between versions, and a bare key ("goal") stops being interpretable once the
-- wording moves. Storing the text makes old rows readable forever.

create table if not exists public.quiz_events (
  id uuid primary key default gen_random_uuid(),

  /**
   * Client-generated idempotency key, unique per logical event.
   *
   * The client retries: a buffered batch can be sent by fetch AND again by
   * sendBeacon on unload, and mobile networks duplicate requests outright.
   * Without a stable key those land as extra rows and silently inflate every
   * funnel count — the exact opposite of what this table is for.
   *
   * Generated once when the event is created (not when it is sent), so a retry
   * of the same event carries the same key and is rejected as a duplicate,
   * while a genuine re-answer of the same question gets a new one and is kept.
   */
  event_id uuid not null unique,

  -- ── Identity ──────────────────────────────────────────────────────────────
  /** Stable per-device id from the client (attribution.ts). Present pre-email. */
  anon_id text not null,
  /** Per-visit id; a returning visitor shares anon_id but gets a new session. */
  session_id text,
  /** Filled in from the email step onward, and backfilled onto earlier rows. */
  email text,
  /** Linked once the visitor becomes a user; null for everyone who never signs up. */
  user_id uuid references public.users(id) on delete set null,

  -- ── What happened ─────────────────────────────────────────────────────────
  /** step_view | step_answer | quiz_start | quiz_complete | quiz_abandon */
  event_name text not null,
  /** Position in the flow (1-based), so a funnel is a simple order-by. */
  step_order int,
  /** Stable slug of the screen, e.g. "main_goal". */
  step_id text,
  /** Section the screen belongs to: intro | profile | pain | goals | signup… */
  section text,
  /** question | info | loader | milestone — info screens drop off differently. */
  step_type text,

  -- ── The answer ────────────────────────────────────────────────────────────
  /** Question wording as shown. See the note above on why this is stored. */
  question_text text,
  /** Human-readable answer ("Land a new job"). */
  answer_label text,
  /** Machine value ("earn_more"); for multi-select this is a JSON array. */
  answer_value jsonb,

  -- ── Timing ────────────────────────────────────────────────────────────────
  /** Milliseconds spent on this screen. Separates a bounce from deliberation. */
  ms_on_step int,
  /** Milliseconds since the quiz started. */
  ms_in_quiz int,

  -- ── Context ───────────────────────────────────────────────────────────────
  /** Quiz/funnel versions so cohorts stay comparable across copy changes. */
  quiz_version text,
  landing_version text,
  /** Creative + UTM snapshot, so answers can be sliced by the ad that drove them. */
  attribution jsonb not null default '{}'::jsonb,
  /** Anything not worth a column yet (A/B flags, experiment buckets). */
  props jsonb not null default '{}'::jsonb,

  landing text not null default 'usa',
  /** mobile | desktop | tablet — drop-off differs sharply by device. */
  device text,

  created_at timestamptz not null default now()
);

-- Funnel queries: "how many reached each step", ordered.
create index if not exists idx_quiz_events_step
  on public.quiz_events(step_id, created_at desc);

-- Session reconstruction: replay one visitor's path in order.
create index if not exists idx_quiz_events_anon
  on public.quiz_events(anon_id, created_at);

-- Joining answers to outcomes (did this person buy?).
create index if not exists idx_quiz_events_email
  on public.quiz_events(email)
  where email is not null;

create index if not exists idx_quiz_events_created
  on public.quiz_events(created_at desc);

-- Cohort comparison between quiz versions.
create index if not exists idx_quiz_events_version
  on public.quiz_events(quiz_version, created_at desc)
  where quiz_version is not null;

-- Deduplication is handled by the `event_id unique` constraint on the column
-- itself, which covers every event including those without a step_id. A
-- composite index on (anon_id, event_name, step_id, ms_on_step) was considered
-- and rejected: it misses events with no step_id, and a retry that recomputes
-- ms_on_step would slip through as a duplicate.

-- Service-role only: written by the API, read by admin/analytics tooling.
alter table public.quiz_events enable row level security;


-- ── Convenience view: the final answer per step, per attempt ────────────────
-- The append-only log keeps every attempt; this collapses it to "what they
-- finally said", which is what profile-style queries want.
--
-- Grouped by session, not anon_id: a second visit from the same device is a
-- separate run with its own answers, and merging them would silently overwrite
-- the first attempt's data with the second's.
create or replace view public.quiz_answers_latest as
select distinct on (coalesce(session_id, anon_id), step_id)
  anon_id,
  session_id,
  coalesce(session_id, anon_id) as attempt_id,
  email, step_id, step_order, section,
  question_text, answer_label, answer_value, quiz_version, attribution,
  created_at
from public.quiz_events
where event_name = 'step_answer' and step_id is not null
order by coalesce(session_id, anon_id), step_id, created_at desc;


-- ── Convenience view: the drop-off funnel ───────────────────────────────────
-- The biggest gap between consecutive rows is the screen losing the most people.
--
-- Counted per SESSION, not per anon_id: anon_id lives in localStorage across
-- visits, so someone who starts the quiz on Monday and restarts on Tuesday is
-- one anon_id but two attempts. Counting anon_ids would merge those into a
-- single run and understate both the traffic and the drop-off.
--
-- `avg_seconds` uses the median instead of the mean: one visitor who leaves the
-- tab open for an hour drags a mean into uselessness, and time-on-step is
-- exactly where that happens.
create or replace view public.quiz_funnel as
select
  step_order,
  step_id,
  section,
  count(distinct coalesce(session_id, anon_id)) as reached,
  count(distinct coalesce(session_id, anon_id))
    filter (where event_name = 'step_answer') as answered,
  -- Cast to numeric: percentile_cont returns double precision, and round(x, n)
  -- has no double-precision overload in Postgres.
  round(
    (percentile_cont(0.5) within group (
      order by ms_on_step
    ) filter (where ms_on_step is not null) / 1000.0)::numeric,
    1
  ) as median_seconds,
  count(distinct anon_id) as unique_devices
from public.quiz_events
where step_id is not null
group by step_order, step_id, section
order by step_order;

comment on table public.quiz_events is
  'Append-only per-step quiz log. Keyed by anon_id so abandoned sessions are captured too.';

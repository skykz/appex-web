-- Quiz content in the database: questions, options and flow become data.
--
-- WHY
-- Today every question lives in QuizOverlay.tsx, so changing a single word — or
-- reordering two screens to test a hypothesis — needs a code change and a
-- deploy. That makes the quiz effectively untestable: by the time a variant
-- ships, the traffic that motivated it has moved on. Jobescape runs the same
-- funnel from a `quiz-node` API and is on quiz version v7.3.0 with dozens of
-- recorded variants; the iteration speed IS the product.
--
-- It also fixes a concrete gap in quiz_events (migration 037): `question_text`
-- currently stores the answer KEY, because the real wording only exists inside
-- JSX. With the text in the DB, every recorded answer can carry the exact
-- question as it was shown.
--
-- SHAPE
-- A version owns an ordered list of steps. Steps are addressed by a stable
-- `step_id` slug (the same one quiz_events already records), so analytics keeps
-- working across content edits and version switches.
--
-- Branching is modelled but not used: `next_step_id` + `condition` describe a
-- graph, and Jobescape's own nodes carry the same two fields with null in every
-- one — they run a straight line too. Encoding it now costs nothing and avoids
-- a migration later.

-- ── Versions ────────────────────────────────────────────────────────────────
create table if not exists public.quiz_versions (
  id uuid primary key default gen_random_uuid(),
  /** Semver-ish label recorded on every event, e.g. "v1.0.0". */
  version text not null unique,
  landing text not null default 'usa',
  /**
   * Exactly one version per landing serves live traffic. Enforced by the
   * partial unique index below rather than by convention, because two active
   * versions would split the funnel silently and corrupt every comparison.
   */
  is_active boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_quiz_versions_one_active
  on public.quiz_versions(landing)
  where is_active;

-- ── Steps ───────────────────────────────────────────────────────────────────
create table if not exists public.quiz_steps (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.quiz_versions(id) on delete cascade,

  /**
   * Stable analytics slug ("main_goal"). Joins to quiz_events.step_id, so it
   * must stay put even when the wording or position changes — renaming it
   * breaks the continuity of every historical funnel.
   */
  step_id text not null,
  /** Position in the flow, 1-based. */
  step_order int not null,

  /** question | info | loader | milestone — these drop off very differently. */
  step_type text not null default 'question',
  /** intro | profile | pain | goals | value | plan | signup */
  section text not null default 'goals',

  -- ── Content ───────────────────────────────────────────────────────────────
  /** The question exactly as shown; copied onto each answer event. */
  question_text text,
  subtitle text,
  /**
   * Answer key written into the quiz answers object ("main_goal"). Usually the
   * same as step_id, but kept separate: one screen can collect a field under a
   * different name, and analytics must not be forced to follow product naming.
   */
  answer_key text,

  /**
   * Options as [{ value, label, icon, emoji }]. JSON rather than a child table
   * on purpose — options are never queried independently, always rendered as a
   * whole, and a table would turn every screen render into a join.
   */
  options jsonb not null default '[]'::jsonb,

  /** single | multi | text | email | none(for info screens) */
  input_type text not null default 'single',

  /** Free-form per-type extras: image keys, CTA labels, loader phases. */
  content jsonb not null default '{}'::jsonb,

  -- ── Flow ──────────────────────────────────────────────────────────────────
  /**
   * Next step. Null means "the one after this by step_order", so a simple
   * linear quiz needs no wiring at all and can't drift out of sync.
   */
  next_step_id text,
  /**
   * Reserved for branching: [{ when: {answer: "x"}, goto: "step_id" }].
   * Unused today (see the header note).
   */
  condition jsonb,

  -- ── Progress UI ───────────────────────────────────────────────────────────
  progress_title text,
  progress_value int,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  /** A slug appears once per version; this is what makes step_id addressable. */
  unique (version_id, step_id),
  /** Two screens can't claim the same position. */
  unique (version_id, step_order)
);

create index if not exists idx_quiz_steps_version_order
  on public.quiz_steps(version_id, step_order);

-- Service-role writes (admin tooling); the public read path goes through the
-- API, which serves only the active version.
alter table public.quiz_versions enable row level security;
alter table public.quiz_steps enable row level security;

comment on table public.quiz_steps is
  'Quiz content as data. step_id is the stable analytics key shared with quiz_events.';

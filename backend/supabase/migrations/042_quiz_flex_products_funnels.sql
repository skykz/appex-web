-- Multi-product, multi-creative quiz: products, funnels (creatives), flow A/B splits.
--
-- WHY
-- Migration 038 made quiz CONTENT data (one active version per landing). That is
-- not enough for what the funnel now has to do:
--   * three products are sold (Claude automation, Claude for Excel/Word, AI video
--     studio), and the one after payment differs per product;
--   * each product has its own ad creatives, and a creative must be able to open
--     a DIFFERENT first screen — that first screen is the whole point of the ad;
--   * paid traffic lands directly on the quiz, never the landing page, so the
--     creative→quiz mapping is the entry point of the entire funnel;
--   * two flow versions must be able to run side by side under one creative to
--     be compared.
--
-- `quiz_versions.is_active` (one per landing) cannot express any of that: it
-- allows exactly one live flow per landing, so a second creative with a second
-- first screen has nowhere to live.
--
-- SHAPE
--   quiz_products  — what is sold; drives post-purchase entitlement.
--   quiz_funnels   — a creative. Addressed by `?c=<slug>` on the quiz URL. Points
--                    at a product and (via quiz_funnel_flows) at one or more flow
--                    versions.
--   quiz_funnel_flows — which flow version(s) a funnel serves, with weights. One
--                    row = no split; two rows = an A/B test.
--
-- Deliberately NOT replacing quiz_versions/quiz_steps: those already hold the
-- content and the step_id taxonomy that quiz_events joins on. This migration adds
-- the routing layer above them and leaves `is_active` alone as the fallback for
-- anything that arrives without a `?c=`.

-- ── Products ────────────────────────────────────────────────────────────────
create table if not exists public.quiz_products (
  id uuid primary key default gen_random_uuid(),
  /**
   * Stable slug recorded on every event and carried into Stripe metadata:
   * "claude_automation" | "claude_office" | "ai_video_studio". Renaming one
   * breaks the link between historical events and the product they were for, so
   * it must stay put once traffic has run against it.
   */
  slug text not null unique,
  name text not null,
  /**
   * Where the buyer lands after paying. Different per product — the video studio
   * is a different app surface, not a different course inside the same one — and
   * this is what lets the post-purchase handoff branch without a code change.
   */
  post_purchase_path text,
  /** Domain this product's funnel is served from, when it has its own. */
  domain text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Funnels (creatives) ─────────────────────────────────────────────────────
create table if not exists public.quiz_funnels (
  id uuid primary key default gen_random_uuid(),
  /**
   * The `?c=` value in the ad URL ("excel_hook_v2"). This is what the ad manager
   * pastes into Meta, so it is user-facing in practice: keep it short and stable.
   *
   * Distinct from attribution's `?v=` on purpose. `v` tags the ad CREATIVE IMAGE
   * for attribution; `c` selects WHICH QUIZ to render. Two ads with different
   * images and the same questions share a `c` and differ by `v`.
   */
  slug text not null unique,
  product_id uuid not null references public.quiz_products(id) on delete restrict,
  name text,
  /**
   * Turning a creative off must not delete it: its slug stays live in ad URLs
   * that are still being served, and old events still reference it. An inactive
   * funnel falls back to the product's default flow rather than 404-ing a
   * visitor who clicked a paused ad.
   */
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_quiz_funnels_product
  on public.quiz_funnels(product_id)
  where is_active;

-- ── Funnel → flow version(s), with A/B weights ──────────────────────────────
create table if not exists public.quiz_funnel_flows (
  id uuid primary key default gen_random_uuid(),
  funnel_id uuid not null references public.quiz_funnels(id) on delete cascade,
  version_id uuid not null references public.quiz_versions(id) on delete restrict,

  /**
   * Relative share of traffic. Weights are relative, not percentages, so a split
   * can be changed by editing one row (50/50 → 90/10) without having to keep the
   * set summing to 100 — which is exactly the edit that gets fumbled mid-test.
   *
   * A single row with any weight means "all traffic here".
   */
  weight int not null default 1 check (weight >= 0),

  /**
   * Names the arm in reports ("control" / "shorter_intro"). Recorded on every
   * event, so a split is readable without having to resolve version ids.
   */
  bucket text not null default 'control',

  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  /** One row per (funnel, version): a version can't be double-listed in a split. */
  unique (funnel_id, version_id),
  /** Bucket names must be unique within a funnel, since reports group by them. */
  unique (funnel_id, bucket)
);

create index if not exists idx_quiz_funnel_flows_funnel
  on public.quiz_funnel_flows(funnel_id)
  where is_active;

-- ── quiz_versions: scope the version label per product ──────────────────────
-- 038 declared `version text not null unique` globally. That blocks the very
-- first thing this migration exists to enable: every product wanting its own
-- "v1.0.0". Re-scope uniqueness to (product, version) so version labels are
-- per-product, and attach versions to a product.
--
-- product_id stays nullable: existing rows predate products, and backfilling them
-- to a guessed product would be inventing data. Null means "the legacy usa flow",
-- which the resolver treats as claude_automation's default.
alter table public.quiz_versions
  add column if not exists product_id uuid references public.quiz_products(id) on delete restrict;

alter table public.quiz_versions
  drop constraint if exists quiz_versions_version_key;

-- coalesce, because a unique index treats every null product_id as distinct and
-- would let duplicate legacy labels through — the exact collision being prevented.
create unique index if not exists idx_quiz_versions_product_version
  on public.quiz_versions(coalesce(product_id::text, 'legacy'), version);

-- `is_active` was one-per-LANDING. Three products can share a landing, so that
-- index now lets only one of them have a live default flow. Re-scope it to
-- one-per-(landing, product).
--
-- `is_active` keeps a narrower job than before: it marks a product's DEFAULT flow,
-- used when a visitor arrives with no `?c=` or with an unknown one. Traffic that
-- does carry a known `?c=` is routed by quiz_funnel_flows and ignores this flag.
drop index if exists public.idx_quiz_versions_one_active;

create unique index if not exists idx_quiz_versions_one_active_per_product
  on public.quiz_versions(landing, coalesce(product_id::text, 'legacy'))
  where is_active;

-- ── Event dimensions ────────────────────────────────────────────────────────
-- Columns, not props: every funnel report filters on these, and a jsonb lookup
-- in a WHERE clause costs an index we would then have to maintain per key.
alter table public.quiz_events
  add column if not exists product_slug text,
  add column if not exists funnel_slug  text,
  add column if not exists flow_version text,
  add column if not exists ab_bucket    text,
  /**
   * Named funnel stage, set only on the events that reach one (null elsewhere).
   *
   * This is what makes creatives of DIFFERENT LENGTHS comparable. step_order 12
   * is a pain question in one flow and the email screen in another, so comparing
   * two creatives by step_order is meaningless; comparing them by
   * "% reaching email_captured" is not.
   */
  add column if not exists checkpoint   text;

-- Cross-creative comparison: "which creative converts best to each checkpoint".
create index if not exists idx_quiz_events_checkpoint
  on public.quiz_events(checkpoint, funnel_slug, created_at desc)
  where checkpoint is not null;

-- Per-creative drop-off, the most common report.
create index if not exists idx_quiz_events_funnel
  on public.quiz_events(funnel_slug, flow_version, step_order)
  where funnel_slug is not null;

comment on column public.quiz_events.funnel_slug is
  'Creative that opened the quiz (?c=). Selects the flow; distinct from attribution ?v=, which tags the ad image.';
comment on column public.quiz_events.checkpoint is
  'Named funnel stage. The only sound way to compare flows of differing length.';

alter table public.quiz_products    enable row level security;
alter table public.quiz_funnels     enable row level security;
alter table public.quiz_funnel_flows enable row level security;

-- ── Cross-creative checkpoint funnel ────────────────────────────────────────
-- The report the ad manager actually needs: for each creative, how many sessions
-- reached each named stage. Ordered by a fixed stage rank rather than step_order,
-- because step_order is not comparable across flows — which is the whole reason
-- checkpoints exist.
create or replace view public.quiz_checkpoint_funnel as
select
  funnel_slug,
  product_slug,
  flow_version,
  ab_bucket,
  checkpoint,
  case checkpoint
    when 'entry'            then 1
    when 'profiled'         then 2
    when 'pain_established' then 3
    when 'committed'        then 4
    when 'email_captured'   then 5
    when 'plan_revealed'    then 6
    when 'paywall_view'     then 7
    when 'purchase'         then 8
    else 99
  end as stage_rank,
  count(distinct coalesce(session_id, anon_id)) as sessions
from public.quiz_events
where checkpoint is not null
group by funnel_slug, product_slug, flow_version, ab_bucket, checkpoint
order by funnel_slug, stage_rank;

comment on view public.quiz_checkpoint_funnel is
  'Sessions reaching each named stage, per creative. Use this to compare creatives; use quiz_funnel for drop-off inside one flow.';

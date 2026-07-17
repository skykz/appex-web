-- Ads-funnel creative/variant attribution for landing leads.
--
-- OPTIONAL: attribution is already captured in answers.__attribution (jsonb), so
-- the funnel works without this migration. Apply it to promote the fields to
-- first-class, indexable columns for reporting (which creative → paid users).
--
-- Backfill copies any existing __attribution blob into the new columns.

alter table public.landing_quiz_submissions
  add column if not exists variant      text,
  add column if not exists utm_content  text,
  add column if not exists utm_term     text,
  add column if not exists fbclid        text;

-- Backfill from the jsonb blob written before this migration.
update public.landing_quiz_submissions
set
  variant     = coalesce(variant,     answers->'__attribution'->>'variant'),
  utm_source  = coalesce(utm_source,  answers->'__attribution'->>'utm_source'),
  utm_campaign= coalesce(utm_campaign, answers->'__attribution'->>'utm_campaign'),
  utm_medium  = coalesce(utm_medium,  answers->'__attribution'->>'utm_medium'),
  utm_content = coalesce(utm_content, answers->'__attribution'->>'utm_content'),
  utm_term    = coalesce(utm_term,    answers->'__attribution'->>'utm_term'),
  fbclid      = coalesce(fbclid,      answers->'__attribution'->>'fbclid')
where answers ? '__attribution';

-- Reporting index: leads grouped by creative variant.
create index if not exists idx_landing_quiz_submissions_variant
  on public.landing_quiz_submissions(variant)
  where variant is not null;

-- Records which paywall pricing A/B arm a visitor saw.
--
-- WHY A SEPARATE COLUMN FROM ab_bucket
-- `ab_bucket` (migration 042) names the QUIZ-FLOW arm, assigned by the backend
-- funnel resolver. The pricing test runs independently and simultaneously: the
-- same visitor is in both. Folding two arms into one column would make each
-- test's numbers depend on the other's split, so neither could be read.
--
-- Nullable, like the other funnel dimensions: events written before the pricing
-- test shipped (and any from a client that doesn't send it) simply carry null
-- rather than being forced into a fake "control".
alter table public.quiz_events
  add column if not exists pricing_variant text;

comment on column public.quiz_events.pricing_variant is
  'Paywall pricing A/B arm (control | day_entry). Distinct from ab_bucket, which names the quiz-flow arm — a visitor is in both experiments at once.';

-- The paywall funnel is where this test is decided, so index the stages it is
-- measured on rather than the whole table.
create index if not exists idx_quiz_events_pricing_variant
  on public.quiz_events(pricing_variant, step_id, created_at desc)
  where pricing_variant is not null;

-- ── Pricing experiment report ───────────────────────────────────────────────
-- Sessions reaching each paywall stage, per arm.
--
-- Deliberately counts DISTINCT sessions rather than rows: the paywall re-fires
-- `paywall_view` on remount, and counting rows would score an indecisive visitor
-- who scrolled back and forth as several conversions.
create or replace view public.pricing_variant_funnel as
select
  pricing_variant,
  step_id,
  case step_id
    when 'paywall_view'         then 1
    when 'plan_select'          then 2
    when 'checkout_modal_view'  then 3
    when 'purchase'             then 4
    else 99
  end as stage_rank,
  count(distinct coalesce(session_id, anon_id)) as sessions,
  -- Which plan they picked, so the entry-price test can be read by mix as well
  -- as by volume: an arm can win on conversion while losing on revenue.
  count(distinct coalesce(session_id, anon_id))
    filter (where answer_label is not null) as with_plan
from public.quiz_events
where pricing_variant is not null
  and step_id in ('paywall_view', 'plan_select', 'checkout_modal_view', 'purchase')
group by pricing_variant, step_id
order by pricing_variant, stage_rank;

comment on view public.pricing_variant_funnel is
  'Paywall funnel per pricing A/B arm. Judge the test on purchases AND plan mix — a cheaper entry can lift conversion while lowering revenue per visitor.';

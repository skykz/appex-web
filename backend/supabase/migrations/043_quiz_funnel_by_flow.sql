-- Makes the per-step drop-off funnel flow-aware.
--
-- WHY
-- `quiz_funnel` (migration 037) groups by (step_order, step_id, section) only.
-- With one flow that was complete. With several creatives live at once it silently
-- merges them: a step_id present in two flows sums both, and a step_order that
-- means "pain question" in one flow and "email" in another lands in one row. The
-- resulting funnel looks plausible and is wrong, which is worse than missing.
--
-- Adding the flow dimensions to the GROUP BY keeps each creative's funnel
-- separate. Rows from before migration 042 have null funnel_slug/flow_version and
-- collapse into a single "legacy" group rather than disappearing.
--
-- DROP then CREATE, not CREATE OR REPLACE: the new SELECT changes the leading
-- columns (funnel_slug is now first, where step_order used to be), and Postgres
-- rejects a column rename/reorder via REPLACE ("cannot change name of view
-- column"). These views have no dependent objects, so dropping is safe.
drop view if exists public.quiz_funnel;
create view public.quiz_funnel as
select
  funnel_slug,
  product_slug,
  flow_version,
  ab_bucket,
  step_order,
  step_id,
  section,
  count(distinct coalesce(session_id, anon_id)) as reached,
  count(distinct coalesce(session_id, anon_id))
    filter (where event_name = 'step_answer') as answered,
  -- Median, not mean: one visitor who leaves the tab open for an hour makes a
  -- mean useless, and time-on-step is exactly where that happens.
  round(
    (percentile_cont(0.5) within group (
      order by ms_on_step
    ) filter (where ms_on_step is not null) / 1000.0)::numeric,
    1
  ) as median_seconds,
  count(distinct anon_id) as unique_devices
from public.quiz_events
where step_id is not null
group by funnel_slug, product_slug, flow_version, ab_bucket, step_order, step_id, section
order by funnel_slug, flow_version, step_order;

comment on view public.quiz_funnel is
  'Per-step drop-off WITHIN one flow. Grouped by flow dimensions so concurrent creatives are not merged; compare across creatives with quiz_checkpoint_funnel instead.';

-- `quiz_answers_latest` needs the same treatment for a different reason: it is
-- keyed by (attempt, step_id) and a step_id can now legitimately exist in several
-- flows. Carrying the flow columns through means a joined answer can be attributed
-- to the flow that asked it, rather than being ambiguous.
-- Same DROP-then-CREATE reason as above: the column set changed.
drop view if exists public.quiz_answers_latest;
create view public.quiz_answers_latest as
select distinct on (coalesce(session_id, anon_id), step_id)
  anon_id,
  session_id,
  coalesce(session_id, anon_id) as attempt_id,
  email, step_id, step_order, section,
  question_text, answer_label, answer_value, quiz_version, attribution,
  product_slug, funnel_slug, flow_version, ab_bucket,
  created_at
from public.quiz_events
where event_name = 'step_answer' and step_id is not null
order by coalesce(session_id, anon_id), step_id, created_at desc;

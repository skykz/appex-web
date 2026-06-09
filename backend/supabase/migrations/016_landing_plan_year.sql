-- Align landing quiz selected_plan with Stripe billing intervals (annual = year, not week_12).

alter table public.landing_quiz_submissions
  drop constraint if exists landing_quiz_submissions_selected_plan_check;

update public.landing_quiz_submissions
  set selected_plan = 'year'
  where selected_plan = 'week_12';

alter table public.landing_quiz_submissions
  add constraint landing_quiz_submissions_selected_plan_check
  check (selected_plan is null or selected_plan in ('week_1', 'week_4', 'year'));

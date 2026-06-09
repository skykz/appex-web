-- Allow 1-week billing interval on subscriptions (USA landing paywall).
alter table public.subscriptions
  drop constraint if exists subscriptions_billing_interval_check;

alter table public.subscriptions
  add constraint subscriptions_billing_interval_check
  check (billing_interval is null or billing_interval in ('week_1', 'week_4', 'year'));

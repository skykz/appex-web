-- Tracks when the latest renewal payment failed; used for a 24h content-access grace period.

alter table public.subscriptions
  add column if not exists payment_failed_at timestamptz;

create index if not exists idx_subscriptions_payment_failed_at
  on public.subscriptions (payment_failed_at)
  where payment_failed_at is not null;

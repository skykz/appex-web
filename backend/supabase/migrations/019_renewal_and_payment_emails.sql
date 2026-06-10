-- Renewal 24h reminders, payment-failure notices, access-lock emails, retry counting.

alter table public.subscriptions
  add column if not exists payment_failed_count int not null default 0,
  add column if not exists renewal_reminder_24h_sent_for_period_end timestamptz;

alter table public.user_email_log drop constraint if exists user_email_log_email_type_check;

alter table public.user_email_log add constraint user_email_log_email_type_check check (
  email_type in (
    'payment_success',
    'welcome',
    'renewal_reminder',
    'renewal_reminder_24h',
    'payment_failed_notice',
    'access_locked'
  )
);

create unique index if not exists idx_user_email_log_renewal_24h_per_period
  on public.user_email_log (user_id, period_end)
  where email_type = 'renewal_reminder_24h' and period_end is not null;

create unique index if not exists idx_user_email_log_access_locked_per_period
  on public.user_email_log (user_id, period_end)
  where email_type = 'access_locked' and period_end is not null;

create unique index if not exists idx_user_email_log_payment_failed_per_period
  on public.user_email_log (user_id, period_end)
  where email_type = 'payment_failed_notice' and period_end is not null;

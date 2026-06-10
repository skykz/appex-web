-- Cancellation confirmation and subscription-expired lifecycle emails.

alter table public.user_email_log drop constraint if exists user_email_log_email_type_check;

alter table public.user_email_log add constraint user_email_log_email_type_check check (
  email_type in (
    'payment_success',
    'welcome',
    'renewal_reminder',
    'renewal_reminder_24h',
    'payment_failed_notice',
    'access_locked',
    'cancellation_confirmed',
    'subscription_expired'
  )
);

create unique index if not exists idx_user_email_log_cancellation_confirmed_per_period
  on public.user_email_log (user_id, period_end)
  where email_type = 'cancellation_confirmed' and period_end is not null;

create unique index if not exists idx_user_email_log_subscription_expired_per_period
  on public.user_email_log (user_id, period_end)
  where email_type = 'subscription_expired' and period_end is not null;

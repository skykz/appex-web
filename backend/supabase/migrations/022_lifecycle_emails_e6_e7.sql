-- E6 reengagement and E7 payment-confirmed lifecycle emails.

alter table public.user_email_log
  add column if not exists reference_id text;

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
    'subscription_expired',
    'reengagement',
    'payment_confirmed'
  )
);

create unique index if not exists idx_user_email_log_payment_confirmed_per_invoice
  on public.user_email_log (user_id, reference_id)
  where email_type = 'payment_confirmed' and reference_id is not null;

create index if not exists idx_user_email_log_reengagement_sent
  on public.user_email_log (user_id, sent_at desc)
  where email_type = 'reengagement';

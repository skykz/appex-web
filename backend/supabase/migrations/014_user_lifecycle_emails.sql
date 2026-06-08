-- Lifecycle emails (E1 payment success, E2 welcome, E3 renewal reminder).

alter table public.subscriptions
  add column if not exists renewal_reminder_sent_for_period_end timestamptz;

create table if not exists public.user_email_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  email_type  text not null check (
    email_type in ('payment_success', 'welcome', 'renewal_reminder')
  ),
  mailgun_id  text,
  period_end  timestamptz,
  scheduled_for timestamptz,
  sent_at     timestamptz not null default now()
);

create unique index if not exists idx_user_email_log_signup_emails
  on public.user_email_log (user_id, email_type)
  where email_type in ('payment_success', 'welcome');

create unique index if not exists idx_user_email_log_renewal_per_period
  on public.user_email_log (user_id, period_end)
  where email_type = 'renewal_reminder' and period_end is not null;

create index if not exists idx_user_email_log_user
  on public.user_email_log (user_id, sent_at desc);

alter table public.user_email_log enable row level security;

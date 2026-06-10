-- Idempotency log for payment-first USA landing checkouts (webhook replay safe).

create table if not exists public.landing_checkout_provisions (
  stripe_checkout_session_id text primary key,
  user_id                    uuid not null references public.users(id) on delete cascade,
  stripe_subscription_id     text not null,
  email                      text not null,
  provisioned_at             timestamptz not null default now()
);

create index if not exists idx_landing_checkout_provisions_user
  on public.landing_checkout_provisions (user_id);

alter table public.landing_checkout_provisions enable row level security;

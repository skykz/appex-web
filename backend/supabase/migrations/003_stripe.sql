-- ============================================
-- AppEx — Stripe subscription integration
-- ============================================

-- 1. Customer-to-Stripe mapping (created lazily, lives independent of an active subscription)
create table if not exists public.stripe_customers (
  user_id            uuid primary key references public.users(id) on delete cascade,
  stripe_customer_id text unique not null,
  created_at         timestamptz not null default now()
);

alter table public.stripe_customers enable row level security;
create policy "Users own stripe_customers"
  on public.stripe_customers for all
  using (auth.uid() = user_id);

-- 2. Idempotency log so webhook replays don't double-process events
create table if not exists public.stripe_events (
  id         text primary key,
  type       text not null,
  created_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
-- No policy: only the service role (webhook handler) ever writes here.

-- 3. Extend subscriptions with Stripe-side identifiers and lifecycle fields
alter table public.subscriptions
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists stripe_price_id        text,
  add column if not exists billing_interval       text check (billing_interval in ('week_4', 'year')),
  add column if not exists cancel_at_period_end   boolean not null default false,
  add column if not exists current_period_start   timestamptz,
  add column if not exists current_period_end     timestamptz,
  add column if not exists trial_end              timestamptz,
  add column if not exists currency               text default 'usd';

-- Broaden status enum to mirror Stripe's lifecycle states
alter table public.subscriptions drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in ('active', 'trialing', 'past_due', 'paused', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid'));

-- `cancelled` (British) is now `canceled` (Stripe spelling). Normalize any pre-existing rows.
update public.subscriptions set status = 'canceled' where status = 'cancelled';

-- 4. Extend billing_history with Stripe invoice references
alter table public.billing_history
  add column if not exists stripe_invoice_id        text unique,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists currency                 text default 'usd',
  add column if not exists invoice_url              text,
  add column if not exists invoice_pdf              text,
  add column if not exists status                   text;

create index if not exists idx_subscriptions_stripe_customer on public.subscriptions(stripe_customer_id);
create index if not exists idx_billing_history_stripe_invoice on public.billing_history(stripe_invoice_id);

-- 5. Service-role inserts for stripe_customers/subscriptions/billing_history are needed
--    by the webhook handler (it runs without an auth.uid()). The existing
--    "Users own" policies grant access by user_id, which the webhook does not have;
--    add explicit service-role write policies so the webhook can upsert.
create policy if not exists "Service writes subscriptions"
  on public.subscriptions for all
  to service_role
  using (true)
  with check (true);

create policy if not exists "Service writes billing_history"
  on public.billing_history for all
  to service_role
  using (true)
  with check (true);

create policy if not exists "Service writes stripe_customers"
  on public.stripe_customers for all
  to service_role
  using (true)
  with check (true);

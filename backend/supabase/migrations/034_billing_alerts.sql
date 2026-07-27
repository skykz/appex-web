-- Operational alerts for billing states that need a human to intervene.
--
-- First use: the "1 Week" two-phase conversion. Checkout bills 7 days at the
-- weekly price, then scheduleWeek1Conversion attaches a Subscription Schedule
-- that flips the plan to the 4-week price. That call deliberately never throws
-- (a billing hiccup must not break account provisioning), so without this table
-- a failure would only reach console.error: the customer keeps renewing WEEKLY
-- at the full weekly price instead of the advertised 4-week price, silently and
-- indefinitely. Rows here are the durable, queryable record support acts on.

create table if not exists public.billing_alerts (
  id uuid primary key default gen_random_uuid(),
  -- Machine-readable kind, e.g. 'week1_conversion_failed'.
  alert_type text not null,
  -- Nullable (unlike most tables here): an alert can fire before a user row is
  -- resolved, and losing the user must never delete the billing record — so this
  -- is `set null` rather than the usual `cascade`.
  user_id uuid references public.users(id) on delete set null,
  email text,
  stripe_subscription_id text,
  stripe_customer_id text,
  stripe_checkout_session_id text,
  -- Failure detail (Stripe error message) plus any structured context.
  detail text,
  context jsonb not null default '{}'::jsonb,
  -- Cleared by whoever fixes the subscription in Stripe.
  resolved_at timestamptz,
  resolved_note text,
  created_at timestamptz not null default now()
);

-- Support workflow: the open-alerts queue, newest first.
create index if not exists idx_billing_alerts_unresolved
  on public.billing_alerts(created_at desc)
  where resolved_at is null;

create index if not exists idx_billing_alerts_type
  on public.billing_alerts(alert_type, created_at desc);

-- One open alert per subscription per type: webhook re-delivery must not pile up
-- duplicate rows for the same broken subscription. Resolved rows are exempt, so
-- a subscription that breaks again after a fix still raises a fresh alert.
create unique index if not exists idx_billing_alerts_open_unique
  on public.billing_alerts(alert_type, stripe_subscription_id)
  where resolved_at is null and stripe_subscription_id is not null;

-- Service-role only: written by the Stripe webhook, read by admin tooling.
-- No policies are defined, so RLS denies all anon/authenticated access.
alter table public.billing_alerts enable row level security;

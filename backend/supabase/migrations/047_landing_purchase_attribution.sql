-- Persists the ad-attribution identifiers captured at checkout so that events
-- fired LATER in a subscription's life (renewal, refund, cancellation) can still
-- be matched to the ad click that produced the customer.
--
-- Why this table and not Stripe metadata: `_fbp` / `_fbc` are written to the
-- CHECKOUT SESSION only. A renewal webhook hands us an Invoice -> subscription ->
-- customer, and none of those carry the browser cookies; checkout sessions are
-- not queryable by subscription id and expire. Without a durable copy, every
-- post-purchase conversion event would go to Meta with email-only matching.
--
-- This is inherently forward-only: rows written before this migration have no
-- cookies to recover, so their subscriptions stay email-only for good.
alter table public.landing_checkout_provisions
  add column if not exists fbp             text,
  add column if not exists fbc             text,
  add column if not exists client_ip       text,
  add column if not exists client_ua       text,
  add column if not exists variant         text,
  add column if not exists utm_source      text,
  add column if not exists utm_campaign    text,
  add column if not exists pricing_variant text;

-- Lifecycle webhooks identify a customer by subscription, never by checkout
-- session, so that is the lookup key for reading this attribution back.
create index if not exists idx_landing_checkout_provisions_subscription
  on public.landing_checkout_provisions (stripe_subscription_id);

comment on column public.landing_checkout_provisions.fbp is
  'Meta _fbp browser cookie captured at checkout; match parameter for post-purchase Conversions API events.';

comment on column public.landing_checkout_provisions.fbc is
  'Meta _fbc click cookie captured at checkout (may be synthesized from fbclid); match parameter for post-purchase Conversions API events.';

comment on column public.landing_checkout_provisions.client_ip is
  'Client IP observed at checkout; raises Meta match quality on server-side events fired without a browser.';

comment on column public.landing_checkout_provisions.client_ua is
  'Client User-Agent observed at checkout; raises Meta match quality on server-side events fired without a browser.';

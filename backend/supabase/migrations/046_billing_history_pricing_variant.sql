-- Persists the A/B arm that created an invoice. Revenue analysis must join on
-- this value, not on a user's email: one customer can renew or make another
-- purchase during the reporting window, and those charges do not belong to the
-- pricing arm that generated the observed checkout.
alter table public.billing_history
  add column if not exists pricing_variant text,
  add column if not exists billing_reason text;

create index if not exists idx_billing_history_pricing_variant_paid_at
  on public.billing_history(pricing_variant, billing_reason, paid_at desc)
  where pricing_variant is not null and billing_reason = 'subscription_create';

comment on column public.billing_history.pricing_variant is
  'Pricing A/B arm copied from Stripe subscription metadata for invoice-level revenue attribution.';

comment on column public.billing_history.billing_reason is
  'Stripe invoice billing_reason; subscription_create identifies the initial checkout charge.';

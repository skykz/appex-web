-- Coupon / promo metadata for admin billing visibility

alter table public.billing_history
  add column if not exists subtotal         numeric(10,2),
  add column if not exists discount_amount  numeric(10,2) default 0,
  add column if not exists coupon_label     text,
  add column if not exists promo_code       text;

alter table public.subscriptions
  add column if not exists coupon_label text,
  add column if not exists promo_code   text;

create index if not exists idx_billing_history_promo_code
  on public.billing_history(promo_code)
  where promo_code is not null;

# Stripe Subscription Setup

This integration uses **Stripe Checkout** (hosted) for new sign-ups and the
**Stripe Customer Portal** for payment-method and invoice management. Cancel
and pause are driven by our own UI calling the Stripe API directly so we can
show the yearly win-back offer before cancellation.

## 1. Run the database migration

```bash
psql "$SUPABASE_DB_URL" -f backend/supabase/migrations/003_stripe.sql
psql "$SUPABASE_DB_URL" -f backend/supabase/migrations/015_stripe_week_1.sql
```

This adds Stripe columns to `subscriptions` and `billing_history` and creates
`stripe_customers` (user → Stripe customer mapping) and `stripe_events`
(webhook idempotency log).

## 2. Configure Stripe

In the Stripe Dashboard (https://dashboard.stripe.com):

### Product + prices

1. **Products → Add product** → name "AppEx Premium".
2. Add three **renewal** recurring prices on the product (these are what renews after the intro):

   | Plan | Renewal price | Stripe interval |
   |------|---------------|-----------------|
   | 1 Week | **$17.77** | Weekly, count 1 → `STRIPE_PRICE_1WEEK` |
   | 4 Weeks | **$38.95** | Weekly, count 4 → `STRIPE_PRICE_4WEEK` |
   | Annual | **$127.00** | Yearly → `STRIPE_PRICE_YEARLY` |

3. Create three **intro coupons** (duration = once, first invoice only):

   | Plan | Intro price | Amount off renewal |
   |------|-------------|-------------------|
   | 1 Week | $6.93 | **$10.84** → `STRIPE_INTRO_COUPON_1WEEK` |
   | 4 Weeks | $15.19 | **$23.76** → `STRIPE_INTRO_COUPON_4WEEK` (or legacy `STRIPE_INTRO_COUPON_ID`) |
   | Annual | $49.00 | **$78.00** → `STRIPE_INTRO_COUPON_YEAR` |

   This matches the USA paywall FTC copy without separate one-time products.
   Alternative (spec v2): six price IDs (intro one-time + renewal subscription) —
   only needed if you want intro and renewal as distinct Stripe products.

`STRIPE_PRICE_1WEEK` is optional — if unset, checkout accepts only `week_4` and `year`.
Run migrations `015_stripe_week_1.sql` and `016_landing_plan_year.sql`.

### Intro coupons (USA paywall)

Create three coupons in **Products → Coupons** (duration **Once**):

1. **1-week intro** — Amount off **$10.84** → `STRIPE_INTRO_COUPON_1WEEK`
2. **4-week intro** — Amount off **$23.76** → `STRIPE_INTRO_COUPON_4WEEK`
3. **Annual intro** — Amount off **$78.00** → `STRIPE_INTRO_COUPON_YEAR`

`STRIPE_INTRO_COUPON_ID` still works as a fallback for the 4-week plan if
`STRIPE_INTRO_COUPON_4WEEK` is unset.

The matching intro coupon is attached on **first checkout only** (no prior
Stripe subscription or billing history). Returning subscribers pay full renewal
price. See `userEligibleForIntroCoupon` and `introCouponIdForInterval` in
`src/services/stripe.service.ts`.

### Customer Portal

**Settings → Billing → Customer portal**:

- Enable **Invoice history** and **Update payment method**.
- **Disable** "Cancel subscriptions" and "Update plan" — we expose our own
  cancel/switch flow that includes the yearly win-back. (If you leave them
  on, Stripe will still emit `customer.subscription.updated/deleted` events
  and the webhook will sync correctly, but the win-back UI will be bypassed.)
- Set the **return URL** to `{APP_URL}/settings?section=plan`.

### Webhook endpoint

**Developers → Webhooks → Add endpoint**:

- URL: `https://<your-api-host>/api/stripe/webhook`
- Events to send:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.paused`
  - `customer.subscription.resumed`
  - `customer.subscription.trial_will_end`
  - `invoice.paid`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- After creating, click **Reveal signing secret** and copy it into
  `STRIPE_WEBHOOK_SECRET`.

### Failed payment retries (required for billing policy)

**Settings → Billing → Subscriptions and emails → Manage failed payments**:

- Enable **Smart Retries** with **1 retry** only (matches app logic: first
  failure → 24h grace + email; second failure → lock access + email).
- Disable extended multi-day retry schedules — the app locks access after the
  single retry fails or after the 24h grace window expires.

### Renewal reminder cron

The backend cron (`/api/cron/renewal-emails`) runs **hourly** and sends:

- **3 days** before `current_period_end` (full renewal price)
- **24 hours** before `current_period_end` (full renewal price)
- **Access locked** emails when the payment grace window expires

Set `CRON_SECRET` in Vercel and configure the cron in `backend/vercel.json`.

## 3. Environment variables

In `backend/.env`:

```env
APP_URL=https://app.appex.kz
STRIPE_SECRET_KEY=sk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_PRICE_1WEEK=price_…
STRIPE_PRICE_4WEEK=price_…
STRIPE_PRICE_YEARLY=price_…
STRIPE_INTRO_COUPON_1WEEK=…
STRIPE_INTRO_COUPON_4WEEK=…
STRIPE_INTRO_COUPON_YEAR=…
# Legacy fallback for 4-week intro:
STRIPE_INTRO_COUPON_ID=…
```

For local development use the Stripe test-mode keys and a `stripe listen`
session (see below).

## 4. Local testing with the Stripe CLI

```bash
# In one terminal: start the backend
npm run dev:backend

# In another: forward webhooks to localhost
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

`stripe listen` prints the **signing secret** for the forwarded session — put
that value in `STRIPE_WEBHOOK_SECRET` while developing.

Trigger end-to-end flows with test cards:

| Scenario | Card |
|----------|------|
| Success | `4242 4242 4242 4242` |
| 3D Secure | `4000 0025 0000 3155` |
| Decline | `4000 0000 0000 9995` |

## 5. How the flow works in code

```
Frontend                         Backend                          Stripe
─────────                        ────────                         ──────
Subscribe button
  → POST /subscription/checkout
                                 createCheckoutSession()
                                   getOrCreateCustomer()
                                                                  POST /v1/customers
                                                                  POST /v1/checkout/sessions
                                 returns { url }
window.location = url            ──────────────────────────────►  hosted checkout page
                                                                  payment succeeds
                                                                  POST  /api/stripe/webhook
                                                                  ├─ checkout.session.completed
                                                                  ├─ customer.subscription.created
                                                                  └─ invoice.paid
                                 verifies signature, upserts
                                 subscriptions + billing_history
Browser redirects to             ◄──────────────────────────────  success_url
/settings?checkout=success
GET /subscription
                                 reads cached row from Supabase
                                 (kept in sync by webhooks)
```

The **source of truth is Stripe**. Our `subscriptions` table is a cache that
the webhook handler keeps in sync; UI never trusts client input for plan
state.

## 6. Idempotency

Stripe delivers webhooks **at least once**, so the handler:

1. Verifies the signature with `stripe.webhooks.constructEvent(req.body, sig, secret)` — `req.body` is a raw `Buffer` because the route is mounted with `express.raw({ type: 'application/json' })` **before** `express.json()`.
2. Looks up `event.id` in `public.stripe_events`; if found, returns 200 without re-processing.
3. Runs the handler, then inserts `event.id` into `stripe_events`.

If a handler throws after step 1 but before step 3, Stripe will retry — the
event is replayed safely because the same upserts (`onConflict: user_id` or
`stripe_invoice_id`) are idempotent.

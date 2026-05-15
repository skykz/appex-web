# Stripe Subscription Setup

This integration uses **Stripe Checkout** (hosted) for new sign-ups and the
**Stripe Customer Portal** for payment-method and invoice management. Cancel
and pause are driven by our own UI calling the Stripe API directly so we can
show the yearly win-back offer before cancellation.

## 1. Run the database migration

```bash
psql "$SUPABASE_DB_URL" -f backend/supabase/migrations/003_stripe.sql
```

This adds Stripe columns to `subscriptions` and `billing_history` and creates
`stripe_customers` (user → Stripe customer mapping) and `stripe_events`
(webhook idempotency log).

## 2. Configure Stripe

In the Stripe Dashboard (https://dashboard.stripe.com):

### Product + prices

1. **Products → Add product** → name "AppEx Premium".
2. Add two recurring prices on the product:
   - **4-week plan**: `Recurring`, interval `Weekly`, count `4`, `USD 38.95`.
     Copy the price id (`price_…`) into `STRIPE_PRICE_4WEEK`.
   - **Yearly plan**: `Recurring`, interval `Yearly`, `USD 99.99`.
     Copy the price id into `STRIPE_PRICE_YEARLY`.

### Intro coupon

1. **Products → Coupons → New coupon** → name "Intro first cycle".
2. Type: **Amount off** `23.76 USD` (so $38.95 − $23.76 = $15.19), or
   **Percent off** ≈ `61%`, whichever is cleaner.
3. Duration: **Once**.
4. Copy the coupon id into `STRIPE_INTRO_COUPON_ID`.

Only the 4-week plan attaches this coupon at Checkout (see
`createCheckoutSession` in `src/services/stripe.service.ts`).

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

## 3. Environment variables

In `backend/.env`:

```env
APP_URL=https://app.appex.kz
STRIPE_SECRET_KEY=sk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…
STRIPE_PRICE_4WEEK=price_…
STRIPE_PRICE_YEARLY=price_…
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

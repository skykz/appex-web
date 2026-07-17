# Ads Funnel Setup — Meta Pixel & GA4

How the ads funnel is tracked across **two parallel measurement stacks** — Meta
(Pixel + Conversions API) and Google **GA4** (gtag.js + Measurement Protocol) —
and the steps left to make each fully live.

The funnel: **ad → `landings/usa` (landing + quiz + paywall) → Stripe → `frontend` app.**
Each step fires both a Meta event and a GA4 event. All browser events are already
wired; the two server-side purchase events each need one secret (below). The two
stacks are independent — enabling one does not require the other.

---

## TL;DR — the remaining steps

- **Meta:** set `META_CAPI_ACCESS_TOKEN` (backend) → server `Purchase` fires. (Pixel already defaulted; browser events live.)
- **GA4:** set `VITE_GA4_MEASUREMENT_ID` (landing) + `GA4_MEASUREMENT_ID` & `GA4_API_SECRET` (backend) → GA4 turns on browser + server. Nothing is defaulted for GA4 (no public id to bake in), so it's a full no-op until these are set.

Then run one test purchase and confirm the purchase event lands in each platform.

---

## Events fired

Every funnel step fires a Meta event AND a GA4 event, both stamped with the
creative/UTM attribution.

| Funnel step | Meta event | GA4 event | Fired from |
|---|---|---|---|
| Any route | `PageView` | `page_view` | landing (browser) |
| Landing / role page | `ViewContent` | `view_item` | landing (browser) |
| First quiz answer | `QuizStart` (custom) | `quiz_start` (custom) | landing (browser) |
| Quiz email submit | `Lead` | `generate_lead` | landing (browser) |
| Last quiz screen | `QuizComplete` (custom) | `quiz_complete` (custom) | landing (browser) |
| Paywall → checkout | `InitiateCheckout` | `begin_checkout` | landing (browser) |
| **Payment succeeds** | **`Purchase`** | **`purchase`** | **browser (success page) + backend (server-side)** |

The **purchase** fires from BOTH the browser (on `/checkout/success`) and the
server (webhook), on both platforms, so browser-based reports/audiences and the
ad-blocker-proof server signal are both covered. Each browser+server pair dedups:

**Dedup / attribution keys:**
- Meta `Purchase`: browser and server share `event_id = purchase_<stripe_session_id>` (Meta dedups same-name events by id). Plus `_fbp`/`_fbc` for match quality. (Note: `InitiateCheckout`'s id is separate — a different event name can never dedup against `Purchase`.)
- GA4 `purchase`: browser and server share `transaction_id = <stripe_session_id>` (GA4's purchase dedup key). The browser `begin_checkout`→`purchase` also share the GA4 `client_id`; the server reuses that same `client_id` (forwarded through checkout → Stripe metadata → Measurement Protocol) so its `purchase` attributes to the same user/session.
- GA4 traffic-source attribution comes from the utm query string on the first `page_view`'s `page_location` (GA4 reads source/medium from the URL, not custom params).

**Status:** all browser events are wired for both stacks. Each server purchase is a
safe no-op until its platform's secret(s) are set — see below.

---

## Environment variables

### Backend Vercel project

| Var | Required | Notes |
|---|---|---|
| `META_CAPI_ACCESS_TOKEN` | For Meta server Purchase | Secret. Enables the server-side Meta `Purchase`. |
| `META_PIXEL_ID` | No | Defaults to the live pixel `1766890887825527`. Set only to override. |
| `META_TEST_EVENT_CODE` | No | Set temporarily to route `Purchase` to Events Manager → Test Events while verifying. Remove for real traffic. |
| `GA4_MEASUREMENT_ID` | For GA4 server purchase | `G-XXXX`. Same id as the landing. |
| `GA4_API_SECRET` | For GA4 server purchase | Secret. GA4 Admin → Data Streams → Measurement Protocol API secrets. |

GA4 server `purchase` turns on only when **both** `GA4_MEASUREMENT_ID` and
`GA4_API_SECRET` are set (and the browser supplied a `client_id`). Independent of Meta.

Server-side `Purchase` turns on only when **both** `META_PIXEL_ID` (defaulted) and
`META_CAPI_ACCESS_TOKEN` are present. Until the token is set, `Purchase` is a safe
no-op — payments and provisioning are never affected.

> `Purchase` also depends on the existing Stripe setup (`STRIPE_SECRET_KEY`,
> `STRIPE_WEBHOOK_SECRET`, price IDs, the Stripe webhook, `USA_LANDING_URL`). These
> are already live in prod — the token is the only thing being added.

### Landing Vercel project (`landings/usa`)

| Var | Required | Notes |
|---|---|---|
| `VITE_META_PIXEL_ID` | No | Defaults to `1766890887825527`. Set only for a staging pixel. |
| `VITE_META_TEST_EVENT_CODE` | No | Routes browser events to Test Events while verifying. |
| `VITE_GA4_MEASUREMENT_ID` | For GA4 | `G-XXXX`. When unset, GA4 browser tracking is a full no-op. Not defaulted. |
| `VITE_GA4_DEBUG` | No | `"true"` lets GA4 fire in DEV builds (→ GA4 DebugView). Leave unset in prod. |

The Meta pixel id is public, so it is baked in as a default — Meta tracks with zero
env config. GA4 has no public default, so GA4 stays off until
`VITE_GA4_MEASUREMENT_ID` is set. Both browser stacks are suppressed in DEV builds
unless their debug/test flag is set, so local traffic doesn't pollute production.

---

## Get the Conversions API token

1. Meta **Events Manager** → select the pixel (`1766890887825527`).
2. **Settings** → **Conversions API** → **Generate access token**.
3. Copy the token → backend Vercel project → **Settings → Environment Variables**
   → add `META_CAPI_ACCESS_TOKEN` (Production) → **redeploy** the backend.

The token is a secret: keep it in Vercel env only, never in code or git.

---

## Get the GA4 IDs

1. GA4 **Admin → Data Streams →** your web stream. Copy the **Measurement ID**
   (`G-XXXX`) → set `VITE_GA4_MEASUREMENT_ID` (landing) and `GA4_MEASUREMENT_ID`
   (backend).
2. Same stream → **Measurement Protocol API secrets → Create** → copy the secret →
   set `GA4_API_SECRET` (backend, secret — Vercel env only).
3. Redeploy landing + backend.

Until `VITE_GA4_MEASUREMENT_ID` is set, GA4 does nothing (no baked-in default).

---

## Verify it works

### Meta

1. In Events Manager, open **Test Events** and copy the test code.
2. Temporarily set `META_TEST_EVENT_CODE` (backend) and
   `VITE_META_TEST_EVENT_CODE` (landing), redeploy both.
3. Run one **test-mode** purchase through the real funnel: landing → quiz → paywall
   → Stripe test card → land in the app.
4. In Test Events you should see, in order: `PageView`, `ViewContent`, `QuizStart`,
   `Lead`, `QuizComplete`, `InitiateCheckout`, then `Purchase`.
5. Confirm `InitiateCheckout` and `Purchase` show as **deduplicated** (same
   `event_id`) — not two separate conversions.
6. Remove both `*_TEST_EVENT_CODE` vars and redeploy so real traffic reports to the
   live stream.

### GA4

1. In GA4 open **Admin → DebugView**. Temporarily set `VITE_GA4_DEBUG=true` on the
   landing (routes browser hits to DebugView); redeploy.
2. Run one **test-mode** purchase through the funnel.
3. In DebugView you should see, in order: `page_view`, `view_item`, `quiz_start`,
   `generate_lead`, `quiz_complete`, `begin_checkout`, then `purchase`.
4. Confirm `begin_checkout` (browser) and `purchase` (server) share the same GA4
   user/`client_id` — not two different users. The server `purchase` carries the
   Stripe session id as `transaction_id`.
5. Remove `VITE_GA4_DEBUG` and redeploy for real traffic.

> Note: the GA4 Measurement Protocol production endpoint does not validate event
> payloads and always returns 2xx — use the [MP validation endpoint](https://developers.google.com/analytics/devguides/collection/protocol/ga4/validating-events)
> or DebugView to confirm the server `purchase` is well-formed.

---

## Creative / variant A/B tagging

Point each ad at a tagged URL so you can compare which creative drives paid users:

```
https://<landing-domain>/?v=hero_a&utm_source=meta&utm_campaign=launch_us
https://<landing-domain>/?v=hero_b&utm_source=meta&utm_campaign=launch_us
```

- `v` = your creative/variant label (any short string).
- First-touch is captured on landing and persists through the whole funnel.
- It rides **every** Meta AND GA4 event (as `variant`), the quiz lead row, Stripe
  metadata, and both server purchase events — so Meta breakdowns, GA4 reports, and
  your database all attribute each sale to the exact creative.

### Optional DB migration

Variant/UTM data is already saved on each lead inside
`landing_quiz_submissions.answers.__attribution` (jsonb) — no migration needed to
start collecting.

To promote it to first-class, indexable columns for reporting, apply
`backend/supabase/migrations/033_landing_variant.sql` **manually** (via the Supabase
SQL editor or CLI against the correct project — not via the MCP connection, which
points at a different project). It backfills existing rows from the jsonb blob.

---

## Where the code lives

- Browser Meta pixel + events: `landings/usa/src/lib/meta-pixel.ts`
- Browser GA4 (gtag.js) + events: `landings/usa/src/lib/ga4.ts`
- First-touch attribution capture: `landings/usa/src/lib/attribution.ts`
- Route-level page views / view events: `landings/usa/src/App.tsx` (`RouteAnalytics`)
- Server Meta Purchase (Conversions API): `backend/src/services/meta-capi.service.ts`
  (Graph API `v21.0`, endpoint `graph.facebook.com/v21.0/<pixel>/events`)
- Server GA4 purchase (Measurement Protocol): `backend/src/services/ga4-mp.service.ts`
  (endpoint `google-analytics.com/mp/collect`)
- Both server purchases fired on payment: `backend/src/services/landing-checkout-provision.service.ts`
  (`firePurchaseEvent` — Meta + GA4, each independently gated)
- Meta env config: `backend/src/config/env.ts`

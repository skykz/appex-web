# Ads Funnel Setup — Meta Pixel & Conversions API

How the Meta Ads funnel is tracked, and the one step left to make it fully live.

The funnel: **Meta ad → `landings/usa` (landing + quiz + paywall) → Stripe → `frontend` app.**
Each step fires a Meta event. All browser events are already live; the server-side
`Purchase` event needs one secret (below).

---

## TL;DR — the only remaining step

Set **`META_CAPI_ACCESS_TOKEN`** on the backend Vercel project, then run one test
purchase and confirm `Purchase` appears in Meta Events Manager. That's it.

Everything else has a working default or is already wired.

---

## Events fired

| Funnel step | Meta event | Fired from | Status |
|---|---|---|---|
| Any route | `PageView` | landing (browser) | ✅ live |
| Landing / role page | `ViewContent` | landing (browser) | ✅ live |
| First quiz answer | `QuizStart` (custom) | landing (browser) | ✅ live |
| Quiz email submit | `Lead` | landing (browser) | ✅ live |
| Last quiz screen | `QuizComplete` (custom) | landing (browser) | ✅ live |
| Paywall → checkout | `InitiateCheckout` (value+currency) | landing (browser) | ✅ live |
| **Payment succeeds** | **`Purchase`** (value+currency+plan) | **backend (Conversions API)** | ⬜ **needs token** |

`InitiateCheckout` (browser) and `Purchase` (server) share an `event_id` and pass
`_fbp`/`_fbc`, so Meta **deduplicates** them into one conversion.

---

## Environment variables

### Backend Vercel project

| Var | Required | Notes |
|---|---|---|
| `META_CAPI_ACCESS_TOKEN` | **Yes — the only new thing to add** | Secret. Enables the server-side `Purchase`. |
| `META_PIXEL_ID` | No | Defaults to the live pixel `1766890887825527`. Set only to override. |
| `META_TEST_EVENT_CODE` | No | Set temporarily to route `Purchase` to Events Manager → Test Events while verifying. Remove for real traffic. |

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

The pixel id is public (embedded in client HTML), so it is safe as a baked-in
default — the landing tracks with zero env config.

---

## Get the Conversions API token

1. Meta **Events Manager** → select the pixel (`1766890887825527`).
2. **Settings** → **Conversions API** → **Generate access token**.
3. Copy the token → backend Vercel project → **Settings → Environment Variables**
   → add `META_CAPI_ACCESS_TOKEN` (Production) → **redeploy** the backend.

The token is a secret: keep it in Vercel env only, never in code or git.

---

## Verify it works

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

---

## Creative / variant A/B tagging

Point each ad at a tagged URL so you can compare which creative drives paid users:

```
https://<landing-domain>/?v=hero_a&utm_source=meta&utm_campaign=launch_us
https://<landing-domain>/?v=hero_b&utm_source=meta&utm_campaign=launch_us
```

- `v` = your creative/variant label (any short string).
- First-touch is captured on landing and persists through the whole funnel.
- It rides **every** Meta event (as `variant`), the quiz lead row, Stripe metadata,
  and the `Purchase` `custom_data` — so **both Meta breakdowns and your database**
  attribute each sale to the exact creative.

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

- Browser pixel + events: `landings/usa/src/lib/meta-pixel.ts`
- First-touch attribution capture: `landings/usa/src/lib/attribution.ts`
- Route-level PageView/ViewContent: `landings/usa/src/App.tsx` (`RouteAnalytics`)
- Server Purchase (Conversions API): `backend/src/services/meta-capi.service.ts`
  (Graph API `v21.0`, endpoint `graph.facebook.com/v21.0/<pixel>/events`)
- Purchase fired on payment: `backend/src/services/landing-checkout-provision.service.ts`
- Meta env config: `backend/src/config/env.ts`

import type { Answers } from "@/quiz/QuizContext";
import { getLearnerAppUrl } from "@/lib/checkout-redirect";
import { getAttributionParams, getSessionId } from "@/lib/attribution";
import { getFunnelDimensions } from "@/lib/quiz-tracker";

const LANDING_ID = "usa";

export type LandingPlanId = "week_1" | "week_4" | "year";

export type SubmitQuizPayload = {
  email: string;
  name?: string;
  answers?: Answers | Record<string, unknown>;
  selected_plan?: LandingPlanId;
};

export type SubmitQuizResult = {
  id: string;
  email: string;
  landing: string;
  created: boolean;
  created_at: string;
  updated_at: string;
};

/**
 * Normalizes VITE_API_URL to the Express `/api` mount (handles origin-only or …/api).
 */
function normalizeApiBase(trimmed: string): string {
  const base = trimmed.replace(/\/+$/, "");
  if (base.endsWith("/api")) return base;
  try {
    const withScheme = /^https?:\/\//i.test(base) ? base : `https://${base}`;
    const u = new URL(withScheme);
    const path = (u.pathname || "/").replace(/\/$/, "") || "/";
    if (path === "/") return `${u.origin}/api`;
  } catch {
    /* keep base if URL is invalid */
  }
  return base;
}

/**
 * Returns the backend API base URL configured at build time for the USA landing.
 */
export function getApiBaseUrl(): string | null {
  const url = import.meta.env.VITE_API_URL?.trim();
  if (url) return normalizeApiBase(url);
  if (import.meta.env.DEV) return normalizeApiBase("http://localhost:3000");
  return null;
}

/**
 * Stable anonymous browser id used to correlate partial quiz saves before signup.
 */
export function getOrCreateSessionId(): string {
  // Delegates to attribution.ts rather than keeping its own id.
  //
  // This used to mint a SEPARATE id into localStorage, which made it a device id
  // in all but name: it never expired, so every lead from one browser shared a
  // single "session" (26 leads collapsed into 15 ids, one repeated 5 times) and
  // it could never be joined to quiz_events, which uses the real per-visit id.
  //
  // getSessionId() is per-visit (sessionStorage), so a lead row now points at the
  // exact visit whose quiz answers produced it.
  return getSessionId();
}

/**
 * Reads UTM params from the current page URL for attribution on quiz submissions.
 */
export function getUtmParams(): {
  utm_source?: string;
  utm_campaign?: string;
  utm_medium?: string;
} {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm_source = params.get("utm_source") ?? undefined;
    const utm_campaign = params.get("utm_campaign") ?? undefined;
    const utm_medium = params.get("utm_medium") ?? undefined;
    if (!utm_source && !utm_campaign && !utm_medium) return {};
    return { utm_source, utm_campaign, utm_medium };
  } catch {
    return {};
  }
}

/**
 * Parses a failed API response body (JSON or plain/HTML text) into a short message.
 */
async function readApiError(res: Response, fallback: string): Promise<string> {
  const text = await res.text().catch(() => "");
  if (!text) return fallback;
  try {
    const body = JSON.parse(text) as { error?: string; message?: string };
    if (typeof body.error === "string" && body.error) return body.error;
    if (typeof body.message === "string" && body.message) return body.message;
  } catch {
    if (res.status === 404 && /cannot (post|patch)/i.test(text)) {
      return "This payment feature is not deployed on the server yet. Redeploy the backend, then try again.";
    }
  }
  return fallback;
}

/**
 * Persists quiz answers to the backend. Fire-and-forget safe — never throws to callers.
 */
export async function submitLandingQuiz(
  payload: SubmitQuizPayload
): Promise<SubmitQuizResult | null> {
  const base = getApiBaseUrl();
  if (!base) {
    if (import.meta.env.DEV) {
      console.warn("[landing-api] VITE_API_URL is not set — quiz not saved");
    }
    return null;
  }

  const email = payload.email?.trim().toLowerCase();
  if (!email) {
    console.warn("[landing-api] quiz submit skipped — missing email");
    return null;
  }

  try {
    const res = await fetch(`${base}/landing/quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        landing: LANDING_ID,
        session_id: getOrCreateSessionId(),
        ...getUtmParams(),
        // First-touch attribution (variant + utm + fbclid) wins over live-URL utm.
        ...getAttributionParams(),
        ...payload,
        email,
      }),
    });

    if (!res.ok) {
      const message = await readApiError(res, "Quiz could not be saved");
      console.warn("[landing-api] quiz submit failed", res.status, message);
      return null;
    }

    return (await res.json()) as SubmitQuizResult;
  } catch (err) {
    console.warn("[landing-api] quiz submit error", err);
    return null;
  }
}

/**
 * Maps paywall plan index (0 = 1 week, 1 = 4 weeks, 2 = annual) to backend plan ids.
 */
export function planIndexToId(index: number): LandingPlanId {
  if (index === 0) return "week_1";
  if (index === 2) return "year";
  return "week_4";
}

/**
 * Meta attribution passed through to the backend so the server-side Purchase
 * (Conversions API) can deduplicate against the browser InitiateCheckout event.
 */
export type MetaAttribution = {
  event_id?: string;
  fbp?: string | null;
  fbc?: string | null;
};

/**
 * GA4 attribution passed to the backend so the server-side Measurement Protocol
 * `purchase` attributes to the same GA4 client/session as the browser events.
 */
export type Ga4Attribution = {
  client_id?: string | null;
};

/**
 * Starts Stripe Checkout for a USA landing lead (payment-first, no signup required).
 */
export async function createLandingCheckout(args: {
  email: string;
  name?: string;
  interval: LandingPlanId;
  /** Discount tier the paywall was showing when the user clicked (server picks the coupon). */
  discountTier?: "intro" | "exit" | "expired";
  meta?: MetaAttribution;
  ga4?: Ga4Attribution;
}): Promise<{ url: string } | { error: string }> {
  const base = getApiBaseUrl();
  if (!base) {
    return { error: "Checkout is not configured yet. Set VITE_API_URL on the USA landing deployment." };
  }
  if (!args.email) {
    return { error: "Please complete the quiz with your email before choosing a plan." };
  }

  const attribution = getAttributionParams();
  const funnelDims = getFunnelDimensions();
  try {
    const res = await fetch(`${base}/landing/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        landing: LANDING_ID,
        email: args.email.trim().toLowerCase(),
        name: args.name?.trim() || undefined,
        interval: args.interval,
        discount_tier: args.discountTier || "intro",
        meta_event_id: args.meta?.event_id || undefined,
        fbp: args.meta?.fbp || undefined,
        fbc: args.meta?.fbc || undefined,
        ga4_client_id: args.ga4?.client_id || undefined,
        // First-touch creative/UTM tags + Google Ads click id → Stripe metadata →
        // server Purchase attribution (Meta CAPI + GA4 MP / Google Ads).
        variant: attribution.variant || undefined,
        utm_source: attribution.utm_source || undefined,
        utm_campaign: attribution.utm_campaign || undefined,
        utm_adset: attribution.utm_adset || undefined,
        utm_ad: attribution.utm_ad || undefined,
        gclid: attribution.gclid || undefined,
        // Flex-quiz product/creative (recovered from sessionStorage on the paywall
        // route) → Stripe metadata → post-purchase routing to the right surface.
        product_slug: funnelDims.productSlug || undefined,
        funnel_slug: funnelDims.funnelSlug || undefined,
      }),
    });

    if (!res.ok) {
      const message = await readApiError(res, "Could not start checkout. Please try again.");
      return { error: message };
    }

    const body = (await res.json().catch(() => ({}))) as { url?: string };
    if (typeof body?.url !== "string" || !body.url) {
      return { error: "Checkout did not return a payment URL." };
    }

    return { url: body.url };
  } catch (err) {
    console.warn("[landing-api] checkout error", err);
    return { error: "Could not reach the payment server. Please try again." };
  }
}

/**
 * Builds the learner SPA auth callback URL with tokens in the hash (cross-origin handoff).
 */
export function buildLearnerAuthCallbackUrl(args: {
  accessToken: string
  refreshToken: string;
}): string | null {
  const base = getLearnerAppUrl();
  if (!base) return null;
  const hash = new URLSearchParams({
    access_token: args.accessToken,
    refresh_token: args.refreshToken,
  }).toString();
  return `${base}/auth/callback#${hash}`;
}

export type LandingCheckoutStatus = {
  status: "pending" | "ready";
  email: string | null;
  name: string | null;
};

export type CompleteCheckoutResult = {
  accessToken: string;
  refreshToken: string;
  user: { id: string; email: string; name: string | null };
  redirectUrl: string;
};

/**
 * Polls backend until the post-payment learner account is ready.
 */
export async function fetchLandingCheckoutStatus(
  sessionId: string
): Promise<LandingCheckoutStatus | { error: string }> {
  const base = getApiBaseUrl();
  if (!base) {
    return { error: "Checkout status is not configured. Set VITE_API_URL on the USA landing deployment." };
  }

  try {
    const params = new URLSearchParams({ session_id: sessionId });
    const res = await fetch(`${base}/landing/checkout/session?${params.toString()}`);
    if (!res.ok) {
      const message = await readApiError(res, "Could not verify your payment.");
      return { error: message };
    }
    return (await res.json()) as LandingCheckoutStatus;
  } catch {
    return { error: "Could not reach the server. Please try again." };
  }
}

/**
 * Sets password on the provisioned account and returns auth tokens for the learner app.
 */
export async function completeLandingCheckoutAccount(args: {
  sessionId: string;
  password: string;
  name?: string;
}): Promise<CompleteCheckoutResult | { error: string }> {
  const base = getApiBaseUrl();
  if (!base) {
    return { error: "Account setup is not configured. Set VITE_API_URL on the USA landing deployment." };
  }

  try {
    const res = await fetch(`${base}/landing/checkout/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: args.sessionId,
        password: args.password,
        name: args.name?.trim() || undefined,
      }),
    });

    if (!res.ok) {
      const message = await readApiError(res, "Could not create your account.");
      return { error: message };
    }

    return (await res.json()) as CompleteCheckoutResult;
  } catch {
    return { error: "Could not reach the server. Please try again." };
  }
}

/**
 * Saves the plan selected on the paywall for an existing quiz lead.
 */
export async function updateLandingQuizPlan(
  email: string,
  selectedPlan: LandingPlanId
): Promise<boolean> {
  const base = getApiBaseUrl();
  if (!base || !email) return false;

  try {
    const res = await fetch(`${base}/landing/quiz/plan`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        landing: LANDING_ID,
        email: email.trim().toLowerCase(),
        selected_plan: selectedPlan,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn("[landing-api] plan update failed", res.status, err);
      return false;
    }

    return true;
  } catch (err) {
    console.warn("[landing-api] plan update error", err);
    return false;
  }
}

/** Outcome of redeeming a lead email-confirmation token. */
export type LeadConfirmStatus =
  | "confirmed"
  | "already_confirmed"
  | "expired"
  | "invalid"
  | "error";

/**
 * Redeems the token from the "Confirm email" link in the lead confirmation mail.
 *
 * Returns a status only — the backend deliberately never echoes the address, since
 * the token travels in a URL that ends up in history and proxy logs.
 */
export async function confirmLeadEmail(token: string): Promise<LeadConfirmStatus> {
  const base = getApiBaseUrl();
  if (!base) return "error";

  try {
    const params = new URLSearchParams({ token });
    const res = await fetch(`${base}/landing/confirm?${params.toString()}`);
    if (!res.ok) return "error";
    const data = (await res.json()) as { status?: LeadConfirmStatus };
    return data.status ?? "error";
  } catch {
    return "error";
  }
}

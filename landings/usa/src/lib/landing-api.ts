import type { Answers } from "@/quiz/QuizContext";

const SESSION_KEY = "appexLandingSession";
const LANDING_ID = "usa";

export type LandingPlanId = "week_1" | "week_4" | "week_12";

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
 * Returns the backend API base URL configured at build time for the USA landing.
 */
export function getApiBaseUrl(): string | null {
  const url = import.meta.env.VITE_API_URL?.trim();
  return url || null;
}

/**
 * Stable anonymous browser id used to correlate partial quiz saves before signup.
 */
export function getOrCreateSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `sess-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return `sess-${Date.now()}`;
  }
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

  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/landing/quiz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        landing: LANDING_ID,
        session_id: getOrCreateSessionId(),
        ...getUtmParams(),
        ...payload,
        email: payload.email.trim().toLowerCase(),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn("[landing-api] quiz submit failed", res.status, err);
      return null;
    }

    return (await res.json()) as SubmitQuizResult;
  } catch (err) {
    console.warn("[landing-api] quiz submit error", err);
    return null;
  }
}

/**
 * Maps paywall plan index (0 = 1 week, 1 = 4 weeks, 2 = 12 weeks) to backend plan ids.
 */
export function planIndexToId(index: number): LandingPlanId {
  if (index === 0) return "week_1";
  if (index === 2) return "week_12";
  return "week_4";
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
    const res = await fetch(`${base.replace(/\/$/, "")}/api/landing/quiz/plan`, {
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

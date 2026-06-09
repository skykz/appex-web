export type BillingInterval = "week_1" | "week_4" | "year";

/**
 * Returns the learner SPA origin configured at build time for auth/checkout handoff.
 */
export function getLearnerAppUrl(): string | null {
  const url = import.meta.env.VITE_APP_URL?.trim();
  return url ? url.replace(/\/$/, "") : null;
}

/**
 * Builds the post-auth path on the learner app that opens plan checkout for a USA funnel user.
 */
export function buildCheckoutNextPath(interval: BillingInterval): string {
  return `/settings?section=plan&interval=${interval}&from=usa`;
}

type LearnerAuthArgs = {
  tab: "signup" | "signin";
  email?: string;
  name?: string;
  next: string;
};

/**
 * Builds a learner SPA /auth URL with tab, optional prefill, and safe internal redirect.
 */
export function buildLearnerAuthUrl(args: LearnerAuthArgs): string | null {
  const base = getLearnerAppUrl();
  if (!base) return null;

  const params = new URLSearchParams({
    tab: args.tab,
    next: args.next,
  });
  if (args.email) params.set("email", args.email);
  if (args.name) params.set("name", args.name);
  return `${base}/auth?${params.toString()}`;
}

/**
 * Builds the signup URL on the learner app with email/name prefill and post-signup checkout.
 */
export function buildSignupCheckoutUrl(args: {
  email?: string;
  name?: string;
  interval: BillingInterval;
}): string | null {
  return buildLearnerAuthUrl({
    tab: "signup",
    email: args.email,
    name: args.name,
    next: buildCheckoutNextPath(args.interval),
  });
}

/**
 * Builds the sign-in URL for returning users who already picked a plan on the paywall.
 */
export function buildSigninCheckoutUrl(args: {
  email?: string;
  interval: BillingInterval;
}): string | null {
  return buildLearnerAuthUrl({
    tab: "signin",
    email: args.email,
    next: buildCheckoutNextPath(args.interval),
  });
}

/**
 * Builds the sign-in URL for quiz users who have not reached the paywall yet.
 */
export function buildSigninUrl(args?: { email?: string }): string | null {
  return buildLearnerAuthUrl({
    tab: "signin",
    email: args?.email,
    next: "/home",
  });
}

/**
 * Sends the user to account creation → platform checkout for the selected plan.
 */
export function redirectToSignupCheckout(args: {
  email?: string;
  name?: string;
  interval: BillingInterval;
}): boolean {
  const url = buildSignupCheckoutUrl(args);
  if (!url) return false;
  window.location.href = url;
  return true;
}

/**
 * Sends a returning user to sign-in → platform checkout for the selected plan.
 */
export function redirectToSigninCheckout(args: {
  email?: string;
  interval: BillingInterval;
}): boolean {
  const url = buildSigninCheckoutUrl(args);
  if (!url) return false;
  window.location.href = url;
  return true;
}

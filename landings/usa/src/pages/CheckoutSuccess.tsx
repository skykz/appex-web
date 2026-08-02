import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import {
  completeLandingCheckoutAccount,
  fetchLandingCheckoutStatus,
} from "@/lib/landing-api";
import { trackPurchase } from "@/lib/meta-pixel";
import { ga4Purchase } from "@/lib/ga4";
import { pushToDataLayer } from "@/lib/gtm";
import { trackFunnelEvent } from "@/lib/quiz-tracker";
import { PAYWALL_PLANS, PAYWALL_DEFAULT_INDEX } from "@/lib/paywall-plans";
import ConfettiBurst from "@/components/ConfettiBurst";

/**
 * Value reported when the stored checkout value is unavailable — the default
 * plan's recurring price, matching what the paywall and the server-side Purchase
 * would report. Better a correct-order-of-magnitude value than $0.
 */
const FALLBACK_PURCHASE_VALUE = Number(PAYWALL_PLANS[PAYWALL_DEFAULT_INDEX].renewalPrice);

/**
 * Fires the browser Purchase (Meta) + purchase (GA4) exactly once on the success
 * page. Both share keys with their server-side twin so the platforms dedup:
 * Meta by the session-derived eventID, GA4 by transaction_id = the Stripe
 * session id. Value/plan come from the plan the user picked at checkout.
 */
function firePurchaseOnce(sessionId: string): void {
  try {
    // Read from localStorage first (survives a new tab / restored session after
    // the Stripe round-trip); fall back to the legacy sessionStorage key.
    const raw =
      localStorage.getItem("appexCheckout") ?? sessionStorage.getItem("appexCheckout");
    const c = raw
      ? (JSON.parse(raw) as {
          plan?: string
          value?: number
          currency?: string
          discount_tier?: string
        })
      : {};
    // NEVER report 0 — a $0 Purchase silently poisons value-based bidding. If the
    // stored value is missing (storage cleared / different tab), fall back to the
    // default plan's price so the conversion still carries a sane value.
    const stored = typeof c.value === "number" && c.value > 0 ? c.value : null;
    const value = stored ?? FALLBACK_PURCHASE_VALUE;
    const currency = c.currency || "USD";
    trackPurchase({ stripeSessionId: sessionId, value, currency, plan: c.plan });
    ga4Purchase({
      transactionId: sessionId,
      value,
      currency,
      plan: c.plan,
      discountTier: c.discount_tier,
    });
    // GTM trigger for the marketer's own tags (e.g. Google Ads purchase
    // conversion). transaction_id lets them dedup; do NOT add GA4/Pixel in GTM.
    pushToDataLayer("purchase", {
      transaction_id: sessionId,
      value,
      currency,
      plan: c.plan,
      // Which discount tier actually converted (spec §6) — lets revenue be split
      // by intro / exit / expired when reconciling.
      ...(c.discount_tier ? { discount_tier: c.discount_tier } : {}),
    });
    // Closes our own funnel (quiz_events): FUNNEL_ORDER already reserves
    // purchase=110 as the last step, but nothing called this until now — the
    // paywall→purchase conversion was only visible in GA4/Meta, never in our
    // own data.
    trackFunnelEvent("purchase", {
      plan: c.plan,
      value,
      currency,
      discount_tier: c.discount_tier,
    });
  } catch {
    /* never block the success page on tracking */
  }
}

const ORANGE = "#F97316";
const BLACK = "#111111";
const POLL_MS = 1500;
const MAX_POLL_ATTEMPTS = 40;

type PagePhase = "loading" | "form" | "submitting" | "error" | "missing_session";

/**
 * Post-payment success page: waits for account provisioning, then collects password
 * and redirects the learner into the main app while E1/E2 emails send in parallel.
 *
 * ConfettiBurst is mounted here, OUTSIDE the phase branches in
 * CheckoutSuccessContent, so it survives the loading→form transition instead of
 * being unmounted and restarting from scratch: each `if (phase === ...)` below
 * returns a distinct JSX tree, so a burst placed inside one of them would
 * remount (and visibly restart) the moment provisioning finishes.
 */
export default function CheckoutSuccess() {
  return (
    <>
      <ConfettiBurst />
      <CheckoutSuccessContent />
    </>
  );
}

function CheckoutSuccessContent() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id")?.trim() ?? "";

  const [phase, setPhase] = useState<PagePhase>(sessionId ? "loading" : "missing_session");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword;
  const canSubmit = passwordValid && passwordsMatch && name.trim().length > 0;

  const quizName = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("appexQuiz");
      if (!raw) return "";
      const parsed = JSON.parse(raw) as { answers?: { userName?: string; name?: string } };
      return (parsed.answers?.userName ?? parsed.answers?.name)?.trim() ?? "";
    } catch {
      return "";
    }
  }, []);

  // Fire the browser Purchase once, on arrival at the success page — reaching
  // this URL means Stripe already took payment (it's the success_url). Guarded so
  // React re-renders / effect re-runs don't double-fire.
  const purchaseFired = useRef(false);
  useEffect(() => {
    if (!sessionId || purchaseFired.current) return;
    if (sessionStorage.getItem("appexPurchaseFired") === sessionId) {
      purchaseFired.current = true;
      return;
    }
    purchaseFired.current = true;
    sessionStorage.setItem("appexPurchaseFired", sessionId);
    firePurchaseOnce(sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    let attempts = 0;

    const poll = async () => {
      attempts += 1;
      const result = await fetchLandingCheckoutStatus(sessionId);

      if (cancelled) return;

      if ("error" in result) {
        if (attempts >= MAX_POLL_ATTEMPTS) {
          setError(result.error);
          setPhase("error");
          return;
        }
        window.setTimeout(poll, POLL_MS);
        return;
      }

      if (result.status === "ready" && result.email) {
        setEmail(result.email);
        setName(result.name?.trim() || quizName || "");
        setPhase("form");
        return;
      }

      if (attempts >= MAX_POLL_ATTEMPTS) {
        setError(
          "Your payment was received but account setup is taking longer than usual. Check your email for a sign-in link."
        );
        setPhase("error");
        return;
      }

      window.setTimeout(poll, POLL_MS);
    };

    void poll();

    return () => {
      cancelled = true;
    };
  }, [sessionId, quizName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId || !canSubmit || phase === "submitting") return;

    setError(null);
    setPhase("submitting");

    const result = await completeLandingCheckoutAccount({
      sessionId,
      password,
      name: name.trim(),
    });

    if ("error" in result) {
      setError(result.error);
      setPhase("form");
      return;
    }

    window.location.href = result.redirectUrl;
  };

  if (phase === "missing_session") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="mb-3 text-2xl font-bold text-foreground">Invalid checkout link</h1>
          <p className="mb-6 text-muted-foreground">
            This page needs a valid payment session. If you just paid, check your email for a sign-in link.
          </p>
          <Link to="/" className="text-primary font-medium underline hover:text-primary/90">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <div
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "#ECFDF5" }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" className="animate-pulse">
              <circle cx="12" cy="12" r="10" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h1 className="mb-3 text-2xl font-bold text-foreground">Payment received</h1>
          <p className="text-muted-foreground">Setting up your account…</p>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="mb-3 text-2xl font-bold text-foreground">Almost there</h1>
          <p className="mb-6 text-muted-foreground">{error}</p>
          <Link to="/" className="text-primary font-medium underline hover:text-primary/90">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ background: "#ECFDF5" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M9 12l2 2 4-4" />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-foreground">Create your password</h1>
          <p className="text-[15px] text-muted-foreground">
            Your subscription is active. Set a password to start learning now — we&apos;re also sending a sign-in link to your email.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border bg-card p-6 shadow-card space-y-4"
        >
          <div>
            <label htmlFor="email" className="mb-2 block text-[13px] font-semibold text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              readOnly
              value={email}
              className="w-full rounded-xl px-4 py-3 text-[15px] outline-none"
              style={{ background: "#F1F5F9", color: BLACK }}
            />
          </div>

          <div>
            <label htmlFor="name" className="mb-2 block text-[13px] font-semibold text-foreground">
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-orange-300"
              style={{ background: "#F1F5F9", border: "1px solid transparent", color: BLACK }}
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-2 block text-[13px] font-semibold text-foreground">
              Password
            </label>
            <div className="flex gap-2">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 min-w-0 rounded-xl px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-orange-300"
                style={{ background: "#F1F5F9", border: "1px solid transparent", color: BLACK }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="flex items-center justify-center rounded-xl border px-3 text-muted-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password.length > 0 && !passwordValid && (
              <p className="mt-2 text-[12px]" style={{ color: ORANGE }}>
                Use at least 8 characters.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-[13px] font-semibold text-foreground">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-orange-300"
              style={{ background: "#F1F5F9", border: "1px solid transparent", color: BLACK }}
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="mt-2 text-[12px]" style={{ color: ORANGE }}>
                Passwords do not match.
              </p>
            )}
          </div>

          {error && (
            <p className="text-[13px] text-destructive" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit || phase === "submitting"}
            className="w-full rounded-2xl py-4 text-[16px] font-bold text-white disabled:opacity-60"
            style={{ background: BLACK }}
          >
            {phase === "submitting" ? "Starting your plan…" : "Start learning →"}
          </button>

          <p className="text-center text-[12px] text-muted-foreground">
            A welcome email with a backup sign-in link is on its way too.
          </p>
        </form>
      </div>
    </div>
  );
}

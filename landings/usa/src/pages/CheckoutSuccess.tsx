import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import {
  completeLandingCheckoutAccount,
  fetchLandingCheckoutStatus,
} from "@/lib/landing-api";

const ORANGE = "#F97316";
const BLACK = "#111111";
const POLL_MS = 1500;
const MAX_POLL_ATTEMPTS = 40;

type PagePhase = "loading" | "form" | "submitting" | "error" | "missing_session";

/**
 * Post-payment success page: waits for account provisioning, then collects password
 * and redirects the learner into the main app while E1/E2 emails send in parallel.
 */
export default function CheckoutSuccess() {
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

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { confirmLeadEmail, type LeadConfirmStatus } from "@/lib/landing-api";

/**
 * Landing page behind the "Confirm email" button in the lead confirmation mail.
 *
 * Redeems the token on mount and renders one of four outcomes. Deliberately shows
 * no email address: the token sits in the URL, so anyone who sees the link (browser
 * history, a forwarded mail, a proxy log) would otherwise learn whose address it is.
 */
const COPY: Record<
  Exclude<LeadConfirmStatus, "invalid"> | "invalid",
  { emoji: string; title: string; body: string }
> = {
  confirmed: {
    emoji: "✅",
    title: "You're confirmed!",
    body: "Thanks — your email is verified. Watch your inbox for practical tips on getting paid for AI work.",
  },
  already_confirmed: {
    emoji: "👍",
    title: "Already confirmed",
    body: "This email was confirmed earlier. Nothing else to do — you're on the list.",
  },
  expired: {
    emoji: "⌛",
    title: "This link has expired",
    body: "Confirmation links are valid for 7 days. Take the quiz again to get a fresh link, or contact support and we'll sort it out.",
  },
  invalid: {
    emoji: "🤔",
    title: "This link isn't valid",
    body: "The link may be incomplete or already used. Try taking the quiz again to get a new one.",
  },
  error: {
    emoji: "⚠️",
    title: "Something went wrong",
    body: "We couldn't confirm your email just now. Please try the link again in a minute.",
  },
};

const ConfirmEmail = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<LeadConfirmStatus | null>(null);
  // React 18 StrictMode mounts effects twice in dev; without this the token would
  // be redeemed twice and the second call would report "already_confirmed".
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    if (!token) {
      setStatus("invalid");
      return;
    }
    let alive = true;
    void confirmLeadEmail(token).then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
  }, [token]);

  const copy = status ? COPY[status] : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
        {!copy ? (
          <>
            <div className="mb-4 text-4xl" aria-hidden="true">
              ⏳
            </div>
            <h1 className="mb-2 text-2xl font-bold">Confirming your email…</h1>
            <p className="text-muted-foreground">One moment.</p>
          </>
        ) : (
          <>
            <div className="mb-4 text-4xl" aria-hidden="true">
              {copy.emoji}
            </div>
            <h1 className="mb-3 text-2xl font-bold">{copy.title}</h1>
            <p className="mb-6 text-muted-foreground">{copy.body}</p>
            <a
              href="/"
              className="inline-block rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground hover:opacity-90"
            >
              Go to Appex
            </a>
          </>
        )}
      </div>
    </div>
  );
};

export default ConfirmEmail;

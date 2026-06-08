import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Learner SPA origin (frontend Vercel project). Must match backend APP_URL. */
const learnerAppOrigin = import.meta.env.VITE_APP_URL?.replace(/\/$/, "") ?? "";

/**
 * Stripe Checkout success/cancel lands on /settings?section=plan&checkout=….
 * The USA landing does not host account settings — forward to the learner app
 * when VITE_APP_URL is configured on this Vercel project.
 */
export default function SettingsCheckoutReturn() {
  const location = useLocation();

  useEffect(() => {
    if (!learnerAppOrigin) return;
    window.location.replace(`${learnerAppOrigin}/settings${location.search}`);
  }, [location.search]);

  if (learnerAppOrigin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted px-4">
        <p className="text-center text-muted-foreground">Redirecting to your account…</p>
      </div>
    );
  }

  const isSuccess = new URLSearchParams(location.search).get("checkout") === "success";

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="max-w-md text-center">
        <h1 className="mb-3 text-2xl font-bold">
          {isSuccess ? "Payment received" : "Checkout cancelled"}
        </h1>
        <p className="mb-6 text-muted-foreground">
          {isSuccess
            ? "Your subscription is being activated. Sign in to the AppEx learning platform to start your plan."
            : "You were not charged. Sign in to the AppEx learning platform to try again."}
        </p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
}

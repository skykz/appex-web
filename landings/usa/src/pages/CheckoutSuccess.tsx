import { Link } from "react-router-dom";

/**
 * Shown after Stripe redirects back from a successful USA landing checkout.
 * Account provisioning and magic-link email are handled asynchronously by the webhook.
 */
export default function CheckoutSuccess() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div
          className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "#ECFDF5" }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <h1 className="mb-3 text-2xl font-bold text-foreground">Payment received</h1>
        <p className="mb-6 text-muted-foreground">
          Your subscription is being activated. Check your email for a secure link to access your AppEx account and start learning.
        </p>
        <p className="mb-8 text-sm text-muted-foreground">
          The link expires after a short time. If you don&apos;t see the email, check your spam folder.
        </p>
        <Link to="/" className="text-primary font-medium underline hover:text-primary/90">
          Return to Home
        </Link>
      </div>
    </div>
  );
}

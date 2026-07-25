import { useEffect, useRef } from "react";
import {
  DISCOUNT_LABEL,
  priceFor,
  savingsFor,
  promoCodeFor,
  ftcDisclosure,
  type PaywallPlan,
  type DiscountState,
} from "@/lib/paywall-plans";
import { LegalLink } from "@/components/legal/LegalLink";

const ORANGE = "#F97316";
const BLACK = "#111";
const RED = "#DC2626";

type Props = {
  open: boolean;
  plan: PaywallPlan;
  state: DiscountState;
  /** Countdown label ("08:21") shown in the urgency bar. */
  timerLabel: string;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

/**
 * Order-summary modal shown between the plan picker and Stripe.
 *
 * Its job is to carry the timer and the discount all the way to the final click
 * — on a bare redirect that context is lost. Payment itself still happens on
 * Stripe's hosted page, so no card data ever touches this origin.
 */
export default function CheckoutModal({
  open,
  plan,
  state,
  timerLabel,
  loading,
  onClose,
  onConfirm,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const discounted = state !== "expired";
  const today = priceFor(plan, state);
  const saved = savingsFor(plan, state);
  const promo = promoCodeFor(state);

  // Close on Escape, lock background scroll, and move focus into the dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, loading, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(15,23,42,0.55)" }}
      onClick={() => {
        if (!loading) onClose();
      }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-[440px] bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[92vh] overflow-y-auto"
      >
        {/* Urgency bar — keeps the countdown visible at the point of decision */}
        {discounted && (
          <div
            className="flex items-center justify-center gap-2 py-2.5 px-4"
            style={{ background: "#FEF2F2", borderBottom: "1px solid #FECACA" }}
          >
            <span aria-hidden>⏰</span>
            <span className="text-[13px] font-bold" style={{ color: RED }}>
              {DISCOUNT_LABEL[state]} discount expires in {timerLabel} min
            </span>
          </div>
        )}

        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3 mb-5">
            <h2
              id="checkout-modal-title"
              className="text-[22px] font-extrabold tracking-tight"
              style={{ color: BLACK }}
            >
              Complete your checkout
            </h2>
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              disabled={loading}
              aria-label="Close checkout"
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center border-none cursor-pointer disabled:opacity-40"
              style={{ background: "#F1F5F9", color: "#475569" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Order summary */}
          <dl className="text-[14px]">
            <div className="flex items-baseline justify-between py-2">
              <dt style={{ color: "#475569" }}>{plan.label} regular price</dt>
              <dd className="font-semibold" style={{ color: BLACK }}>
                ${plan.fullPrice}
              </dd>
            </div>

            {discounted && (
              <div className="flex items-baseline justify-between py-2">
                <dt style={{ color: "#475569" }}>{DISCOUNT_LABEL[state]} intro discount</dt>
                <dd className="font-semibold" style={{ color: RED }}>
                  −${saved}
                </dd>
              </div>
            )}

            {promo && (
              <div className="flex items-baseline justify-between py-2">
                <dt style={{ color: "#475569" }}>Applied promo code</dt>
                <dd>
                  <span
                    className="text-[12px] font-bold px-2 py-1 rounded-md"
                    style={{ background: "#FFF7ED", color: ORANGE }}
                  >
                    {promo}
                  </span>
                </dd>
              </div>
            )}

            <div className="my-3 border-t" style={{ borderColor: "#E2E8F0" }} />

            <div className="flex items-baseline justify-between">
              <dt className="text-[16px] font-extrabold" style={{ color: BLACK }}>
                Total today
              </dt>
              <dd className="text-[24px] font-black leading-none" style={{ color: BLACK }}>
                ${today}
              </dd>
            </div>

            {discounted && (
              <p className="text-right text-[12.5px] font-bold mt-1.5" style={{ color: RED }}>
                You just saved ${saved} ({DISCOUNT_LABEL[state]} off)
              </p>
            )}

            <div className="flex items-baseline justify-between mt-4 pt-3 border-t" style={{ borderColor: "#E2E8F0" }}>
              <dt className="text-[13px]" style={{ color: "#64748B" }}>
                After {plan.renewUnit} (auto renewed)
              </dt>
              <dd className="text-[13px] font-semibold" style={{ color: "#64748B" }}>
                ${plan.renewalPrice}
              </dd>
            </div>
          </dl>

          {/* Confirm → Stripe's hosted, PCI-compliant payment page */}
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="w-full mt-5 py-4 rounded-2xl text-white font-bold text-[16px] border-none cursor-pointer tracking-wide transition-transform active:scale-[0.99] disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(180deg, #22C55E 0%, #16A34A 100%)` }}
          >
            {loading ? "Redirecting…" : `Subscribe · $${today}`}
          </button>

          <p className="flex items-center justify-center gap-1.5 mt-3 text-[12px]" style={{ color: "#64748B" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Secure payment via Stripe · Apple Pay &amp; cards accepted
          </p>

          {/* FTC negative-option disclosure — must appear before the paid click */}
          <p className="mt-4 text-[11px] leading-relaxed text-center" style={{ color: "#94A3B8" }}>
            {ftcDisclosure(plan, state)}{" "}
            <LegalLink href="/terms" className="underline" style={{ color: "#64748B" }}>
              Terms and Conditions
            </LegalLink>
            {" · "}
            <LegalLink href="/privacy" className="underline" style={{ color: "#64748B" }}>
              Privacy Policy
            </LegalLink>
            {" · "}
            <LegalLink href="/subscription" className="underline" style={{ color: "#64748B" }}>
              Subscription Terms
            </LegalLink>
          </p>
        </div>
      </div>
    </div>
  );
}

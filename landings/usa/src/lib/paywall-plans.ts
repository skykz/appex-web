import type { BillingInterval } from "./checkout-redirect";

/**
 * Discount state of the paywall. One price table rendered three ways:
 * - `intro`   — default on arrival (61% off)
 * - `exit`    — exit-intent upgrade (71% off)
 * - `expired` — the 10-minute timer ran out (no discount, full price)
 */
export type DiscountState = "intro" | "exit" | "expired";

/** Single paywall plan row — intro/renewal amounts match FTC disclosure copy. */
export type PaywallPlan = {
  id: BillingInterval;
  label: string;
  /** Days in one intro cycle — used to derive the "per day" figure. */
  days: number;
  /** Undiscounted first-cycle price (shown once the timer expires). */
  fullPrice: string;
  /** First-cycle price at 61% off. */
  introPrice: string;
  /** First-cycle price at 71% off (exit-intent). */
  exitPrice: string;
  /** Recurring price charged after the intro cycle converts. */
  renewalPrice: string;
  renewalCadence: string;
  /** Short unit shown in "renews at $X/<unit>" copy. */
  renewUnit: string;
  popular?: boolean;
};

/** Discount percentage label per state (drives badges + headline copy). */
export const DISCOUNT_LABEL: Record<DiscountState, string> = {
  intro: "61%",
  exit: "71%",
  expired: "0%",
};

/**
 * Paywall plans in display order: 1 Week, 4 Weeks (default), Annual.
 *
 * Every weekly/4-week plan converts to the same $38.95 / 4-week subscription;
 * Annual renews yearly. The 1-week intro converting to a 4-week cycle is
 * deliberate — it must stay spelled out verbatim in the FTC disclosure.
 */
export const PAYWALL_PLANS: PaywallPlan[] = [
  {
    id: "week_1",
    label: "1 Week",
    days: 7,
    fullPrice: "17.77",
    introPrice: "6.93",
    exitPrice: "5.15",
    renewalPrice: "38.95",
    renewalCadence: "every 4 weeks",
    renewUnit: "4 weeks",
  },
  {
    id: "week_4",
    label: "4 Weeks",
    days: 28,
    fullPrice: "38.95",
    introPrice: "15.19",
    exitPrice: "11.29",
    renewalPrice: "38.95",
    renewalCadence: "every 4 weeks",
    renewUnit: "4 weeks",
    popular: true,
  },
  {
    id: "year",
    label: "Annual",
    days: 365,
    fullPrice: "127",
    introPrice: "49",
    exitPrice: "36.83",
    renewalPrice: "127",
    renewalCadence: "every year",
    renewUnit: "year",
  },
];

export const PAYWALL_DEFAULT_INDEX = 1;

export const PAYWALL_FEATURES = [
  "Build real projects — websites, apps, and more",
  "50+ bite-sized lessons & step-by-step personal plan",
  "Personal AI mentors and 24/7 support chat",
  "Shareable certificate & a full prompt library",
] as const;

/** Formats a number as a 2-decimal price string ("0.99", "15.19"). */
function money(n: number): string {
  return n.toFixed(2);
}

/** Price charged for the first cycle in the given discount state. */
export function priceFor(plan: PaywallPlan, state: DiscountState): string {
  switch (state) {
    case "intro":
      return plan.introPrice;
    case "exit":
      return plan.exitPrice;
    case "expired":
      return plan.fullPrice;
  }
}

/**
 * "Per day" figure for the card, derived from the active price ÷ cycle days,
 * so it always agrees with the amount actually charged.
 */
export function perDayFor(plan: PaywallPlan, state: DiscountState): string {
  return money(Number(priceFor(plan, state)) / plan.days);
}

/** Struck-through "was" per-day figure — always the undiscounted full price. */
export function perDayWasFor(plan: PaywallPlan): string {
  return money(Number(plan.fullPrice) / plan.days);
}

/** Absolute dollars saved versus full price in the given state. */
export function savingsFor(plan: PaywallPlan, state: DiscountState): string {
  return money(Number(plan.fullPrice) - Number(priceFor(plan, state)));
}

/**
 * Display-only promo code shown in the checkout modal ("Applied promo code").
 * Cosmetic: the real discount is a Stripe coupon the server picks, so this
 * string can never change what the customer is actually charged.
 */
export function promoCodeFor(state: DiscountState): string | null {
  switch (state) {
    case "intro":
      return "APPEX61";
    case "exit":
      return "APPEX71";
    case "expired":
      return null;
  }
}

/**
 * FTC negative-option disclosure for the selected plan and discount state.
 *
 * Spells out the amount charged today, that it auto-converts unless cancelled,
 * the exact recurring amount and cadence, and where to cancel. Required copy —
 * do not shorten without legal review.
 */
export function ftcDisclosure(plan: PaywallPlan, state: DiscountState): string {
  const today = priceFor(plan, state);
  // Adjectival form: "1-week" / "4-week" / "1-year" (never "4 weeks introductory plan").
  const introLabel =
    plan.id === "year" ? "1-year" : plan.label.toLowerCase().replace(/s$/, "").replace(/\s+/, "-");
  // "an annual" / "a 4-week" — article included so the sentence reads correctly.
  const cycleLabel = plan.renewUnit === "year" ? "an annual" : "a 4-week";

  return (
    `By clicking "Get My Plan", I agree to pay $${today} for my ${introLabel} introductory plan. ` +
    `Unless I cancel before the end of the ${introLabel} intro plan, it converts to ${cycleLabel} ` +
    `subscription and Appex will automatically charge my payment method the regular price ` +
    `$${plan.renewalPrice} ${plan.renewalCadence} until I cancel. ` +
    `I can cancel anytime in the Manage Subscription tab.`
  );
}

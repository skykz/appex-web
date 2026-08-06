import type { BillingInterval } from "./checkout-redirect";

/**
 * Discount state of the paywall. One price table rendered three ways:
 * - `intro`   — default on arrival (61% off)
 * - `exit`    — exit-intent upgrade (71% off)
 * - `expired` — the 10-minute timer ran out (no discount, full price)
 */
export type DiscountState = "intro" | "exit" | "expired";

/** localStorage key holding the absolute ms timestamp the intro offer expires. */
export const PAYWALL_DEADLINE_KEY = "appexPaywallDeadline";

/**
 * localStorage flag: "1" once the visitor has unlocked the 71% exit-intent
 * tier. Persisted (not just in React state) so a reload — or the discount wheel
 * clearing the timer — can't silently drop them from 71% back to 61%. The wheel
 * awards 61%, so without this a user who already earned 71% would be downgraded
 * and charged more than the better offer they were shown.
 */
export const PAYWALL_EXIT_UNLOCKED_KEY = "appexPaywallExitUnlocked";

/** True if the 71% exit-intent tier was unlocked earlier and should persist. */
export function isExitOfferUnlocked(): boolean {
  try {
    return localStorage.getItem(PAYWALL_EXIT_UNLOCKED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Records that the 71% exit-intent tier is unlocked, durably across reloads. */
export function markExitOfferUnlocked(): void {
  try {
    localStorage.setItem(PAYWALL_EXIT_UNLOCKED_KEY, "1");
  } catch {
    /* storage disabled — the in-memory state still holds for this page life */
  }
}

/**
 * Clears any stored offer deadline so the paywall starts a brand-new countdown
 * on its next mount, putting a returning visitor back on the intro (61%) tier
 * even if their previous countdown had already burned out.
 *
 * Called when the discount wheel is claimed: the wheel always awards 61%, so
 * winning it must actually restore that discount — otherwise the wheel promises
 * 61% and the paywall then charges full price for anyone who returns within the
 * offer-reset window of an expired timer, contradicting the popup they just saw.
 *
 * Deliberately does NOT touch the exit-unlock flag: a visitor already on the
 * 71% tier keeps it after the wheel (the paywall reads the persisted flag and
 * resolves to `exit`), so the wheel can restore 61% without ever downgrading a
 * better offer.
 */
export function resurrectIntroOffer(): void {
  try {
    localStorage.removeItem(PAYWALL_DEADLINE_KEY);
    sessionStorage.removeItem(PAYWALL_DEADLINE_KEY);
  } catch {
    /* storage disabled — the paywall falls back to a fresh in-memory timer anyway */
  }
}

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
  /**
   * Temporarily withheld from sale. The row stays in PAYWALL_PLANS so that
   * plan ids and any stored selections keep resolving; only the rendered list is
   * filtered. Flip back to false to re-list the plan.
   */
  hidden?: boolean;
  /**
   * Replaces the "Save NN%" badge with fixed copy.
   *
   * Needed for entry plans whose price isn't a percentage off this plan's own
   * full price: `day_1` charges $0.99 against a $38.95 base, so the shared
   * DISCOUNT_LABEL ("61%") would be simply wrong on that card, and the true
   * figure (97%) reads as a scam. Naming the price instead is honest and clearer.
   */
  badgeOverride?: string;
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
    /**
     * $0.99 one-day entry, tested against `week_1` as the cheap way in
     * (PRICING_VARIANTS below). Mechanically the same two-phase trick as week_1:
     * the subscription is created on the 4-week price and the tiny first payment
     * comes from a one-off coupon, so after the first day it bills the standard
     * $38.95 every 4 weeks like every other plan.
     *
     * Prices are set explicitly rather than derived from the 61%/71% ladder: at
     * this price point the ladder inverts — 71% off $38.95 is $11.30, i.e. the
     * "better" exit offer would cost MORE than the $0.99 intro. Exit is therefore
     * pinned below intro by hand.
     */
    id: "day_1",
    label: "1 Day",
    days: 1,
    fullPrice: "38.95",
    introPrice: "0.99",
    exitPrice: "0.49",
    renewalPrice: "38.95",
    renewalCadence: "every 4 weeks",
    renewUnit: "4 weeks",
    badgeOverride: "Try for $0.99",
  },
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
    // Sold as a two-phase Stripe Subscription Schedule: 7 days at the weekly
    // intro price (STRIPE_PRICE_1WEEK_INTRO, minus the tier coupon), then it
    // converts to the 4-week price below. See scheduleWeek1Conversion.
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
    /**
     * 12-week plan. Unlike day_1/week_1, this one renews on its OWN cadence
     * (every 12 weeks) rather than converting to the 4-week price, so it needs
     * its own Stripe Price — see STRIPE_PRICE_12WEEK.
     *
     * $37.49 intro is 61% off $96.13, keeping it on the same discount ladder as
     * week_4/year; it works out to $0.45/day, the lowest per-day figure short of
     * the annual plan.
     */
    id: "week_12",
    label: "12 Weeks",
    days: 84,
    fullPrice: "96.13",
    introPrice: "37.49",
    exitPrice: "27.88",
    renewalPrice: "96.13",
    renewalCadence: "every 12 weeks",
    renewUnit: "12 weeks",
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

/**
 * Index of the plan pre-selected on arrival — the 4-week plan, which is also the
 * "Most popular" card.
 *
 * Derived by id rather than written as a literal: this used to be `1`, and
 * inserting a plan above it silently moved the default onto a different (cheaper)
 * plan. Looking it up keeps the default pinned to the intended plan no matter how
 * the array is ordered.
 */
export const PAYWALL_DEFAULT_INDEX = PAYWALL_PLANS.findIndex((p) => p.id === "week_4");

/**
 * Which plans each A/B arm puts on sale, in display order.
 *
 * The test compares the two cheap ways in — a $6.93 week against a $0.99 day —
 * holding everything else equal: both arms show the same number of cards, the
 * same 4-week default, the same "Most popular" badge. Only the entry plan
 * differs, so a difference in the result is attributable to it.
 *
 * Listing ids per arm (rather than a `hidden` flag) keeps every plan in
 * PAYWALL_PLANS permanently — nothing is deleted, an arm just doesn't list it —
 * and makes each arm's shelf readable at a glance.
 */
export const PRICING_VARIANTS = {
  /**
   * Exactly what production sells today — no 12-week plan, and rendered with the
   * old card layout (see `usesPerDayLayout`). This is the honest baseline: the
   * arm has to match the current paywall in every respect, or the experiment
   * measures the difference against something no visitor has ever seen.
   */
  control: ["week_1", "week_4", "year"],
  /**
   * Everything new at once: the $0.99 one-day entry replacing the one-week
   * entry, the 12-week plan, and the per-day card layout.
   *
   * This is a PACKAGE test, not a single-variable one. A win says "the new
   * paywall beats the old one" — it cannot say which of the three changes did
   * the work. That is the deliberate trade for shipping one test instead of
   * three sequential ones; split it later if the winner needs explaining.
   */
  day_entry: ["day_1", "week_4", "week_12", "year"],
} as const satisfies Record<string, readonly BillingInterval[]>;

export type PricingVariant = keyof typeof PRICING_VARIANTS;

/**
 * Whether an arm renders the per-day card layout (big "$0.45 per day" figure)
 * rather than the cycle price. Tied to the arm, not to a plan, because the
 * layout is part of what this experiment is testing.
 */
export function usesPerDayLayout(variant: PricingVariant): boolean {
  return variant !== "control";
}

/** Arm used when nothing has assigned one (direct hits, storage disabled). */
export const DEFAULT_PRICING_VARIANT: PricingVariant = "control";

/**
 * Plans on sale for an arm, paired with each plan's index in PAYWALL_PLANS.
 *
 * Render from this — never from PAYWALL_PLANS directly — but keep using the
 * paired `index` for selection: a selection is carried around as an index into
 * the FULL array, so filtering in place would renumber the cards and sell the
 * wrong plan.
 */
export function visiblePlansFor(
  variant: PricingVariant = DEFAULT_PRICING_VARIANT
): { plan: PaywallPlan; index: number }[] {
  const allowed = PRICING_VARIANTS[variant] ?? PRICING_VARIANTS[DEFAULT_PRICING_VARIANT];
  return PAYWALL_PLANS.map((plan, index) => ({ plan, index })).filter(
    ({ plan }) => !plan.hidden && (allowed as readonly string[]).includes(plan.id)
  );
}

/**
 * Control-arm shelf. Kept as a named export so existing callers and tests that
 * don't care about the experiment keep working unchanged.
 */
export const VISIBLE_PAYWALL_PLANS: { plan: PaywallPlan; index: number }[] =
  visiblePlansFor(DEFAULT_PRICING_VARIANT);

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

  // Same template for every plan, including week_1 — it converts to a 4-week
  // cadence rather than renewing on its own cycle, so it needs to name the
  // intro term ("1-week") separately from the cycle it converts into
  // ("a 4-week subscription"). Adjectival form throughout: "1-week" / "4-week" /
  // "1-year" (never "4 weeks introductory plan").
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

import type { BillingInterval } from "./checkout-redirect";

/** Single paywall plan row — intro/renewal amounts match FTC disclosure copy. */
export type PaywallPlan = {
  id: BillingInterval;
  label: string;
  introPrice: string;
  renewalPrice: string;
  renewalCadence: string;
  perDay: string;
  perDayWas: string;
  popular?: boolean;
};

export const PAYWALL_DISCOUNT_LABEL = "61%";

/** Paywall plans in display order: 1 Week, 4 Weeks (default), Annual. */
export const PAYWALL_PLANS: PaywallPlan[] = [
  {
    id: "week_1",
    label: "1 Week",
    introPrice: "6.93",
    renewalPrice: "17.77",
    renewalCadence: "every week",
    perDayWas: "2.54",
    perDay: "0.99",
  },
  {
    id: "week_4",
    label: "4 Weeks",
    introPrice: "15.19",
    renewalPrice: "38.95",
    renewalCadence: "every 4 weeks",
    perDayWas: "1.39",
    perDay: "0.54",
    popular: true,
  },
  {
    id: "year",
    label: "Annual",
    introPrice: "49",
    renewalPrice: "127",
    renewalCadence: "every year",
    perDayWas: "0.35",
    perDay: "0.27",
  },
];

export const PAYWALL_DEFAULT_INDEX = 1;

export const PAYWALL_FEATURES = [
  "50+ bite-sized lessons",
  "Step-by-step personal plan",
  "AI career coach 24/7",
  "Certificate of completion",
] as const;

/**
 * FTC negative-option disclosure for the selected plan (required below GET MY PLAN).
 */
export function ftcDisclosure(plan: PaywallPlan): string {
  switch (plan.id) {
    case "week_1":
      return `By clicking "Get My Plan", I agree to pay $${plan.introPrice} for a 1-week introductory plan. Unless I cancel before it ends, Appex will automatically charge $${plan.renewalPrice} every week. I can cancel anytime from the subscription page in my account to avoid future charges.`;
    case "week_4":
      return `By clicking "Get My Plan", I agree to pay $${plan.introPrice} for a 4-week introductory plan. Unless I cancel before it ends, Appex will automatically charge $${plan.renewalPrice} every 4 weeks. I can cancel anytime from the subscription page in my account to avoid future charges.`;
    case "year":
      return `By clicking "Get My Plan", I agree to pay $${plan.introPrice} for a 1-year introductory plan. Unless I cancel before it ends, Appex will automatically charge $${plan.renewalPrice} every year. I can cancel anytime from the subscription page in my account to avoid future charges.`;
  }
}

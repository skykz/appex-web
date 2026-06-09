import type { BillingInterval } from "./checkout-redirect";
import {
  buildSigninCheckoutUrl,
  buildSigninUrl,
  getLearnerAppUrl,
} from "./checkout-redirect";

export type MenuLink = {
  label: string;
  href: string;
  newTab?: boolean;
};

/**
 * Legal and account links shown in quiz side menus.
 */
export function getQuizMenuLinks(args?: {
  email?: string;
  interval?: BillingInterval;
}): MenuLink[] {
  const accountHref =
    args?.interval != null
      ? buildSigninCheckoutUrl({ email: args.email, interval: args.interval })
      : buildSigninUrl({ email: args.email });

  return [
    { label: "Privacy Policy", href: "/privacy", newTab: true },
    { label: "Money-back Policy", href: "/subscription", newTab: true },
    { label: "Subscription Terms", href: "/subscription", newTab: true },
    { label: "Terms and Conditions", href: "/terms", newTab: true },
    {
      label: "I already have an account",
      href: accountHref ?? "#",
      newTab: Boolean(accountHref && getLearnerAppUrl()),
    },
  ];
}

import type { BillingInterval } from "./checkout-redirect";
import {
  buildSigninCheckoutUrl,
  buildSigninUrl,
  getLearnerAppUrl,
} from "./checkout-redirect";
import { legalPolicyHref, resolveLegalLang } from "./legal-lang";

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

  const lang = resolveLegalLang();

  return [
    { label: "Privacy Policy", href: legalPolicyHref("/privacy", lang), newTab: true },
    { label: "Money-back Policy", href: legalPolicyHref("/subscription", lang), newTab: true },
    { label: "Subscription Terms", href: legalPolicyHref("/subscription", lang), newTab: true },
    { label: "Terms and Conditions", href: legalPolicyHref("/terms", lang), newTab: true },
    {
      label: "I already have an account",
      href: accountHref ?? "#",
      newTab: Boolean(accountHref && getLearnerAppUrl()),
    },
  ];
}

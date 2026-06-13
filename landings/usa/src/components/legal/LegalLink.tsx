import type { ReactNode } from "react";
import { legalPolicyHref, resolveLegalLang, type LegalLang } from "@/lib/legal-lang";

type LegalLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  lang?: LegalLang;
};

/**
 * Opens legal policy routes in a new tab with the user's preferred document language.
 */
export function LegalLink({ href, children, className, style, onClick, lang }: LegalLinkProps) {
  const resolvedHref = legalPolicyHref(href, lang ?? resolveLegalLang());

  return (
    <a
      href={resolvedHref}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      style={style}
      onClick={onClick}
    >
      {children}
    </a>
  );
}

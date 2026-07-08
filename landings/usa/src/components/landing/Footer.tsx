import { legalPolicyHref, resolveLegalLang } from "@/lib/legal-lang";

const links = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Subscription Policy", href: "/subscription" },
  { label: "Terms & Conditions", href: "/terms" },
];

export default function Footer() {
  const lang = resolveLegalLang();

  return (
    <footer className="bg-background border-t border-border py-8 md:py-10 px-4 md:px-10">
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-6">
        <a href="/" className="text-xl font-bold select-none tracking-tight">
          <span className="text-foreground">App</span>
          <span className="text-primary">ex</span>
        </a>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {links.map((l) => (
            <a
              key={l.label}
              href={legalPolicyHref(l.href, lang)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] md:text-sm text-muted-foreground hover:text-foreground transition-colors font-body"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-5">
          {/* Instagram — USA brand profile */}
          <a
            href="https://www.instagram.com/appex_me/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Appex on Instagram"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </a>
        </div>
      </div>

      <div className="max-w-5xl mx-auto mt-6 pt-6 border-t border-border flex flex-col md:flex-row items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground font-body">
          © 2026 Appex. All rights reserved.
        </p>
        <p className="text-xs text-muted-foreground font-body">
          Questions?{" "}
          <a href="mailto:hello@appex.me" className="hover:text-foreground transition-colors">
            hello@appex.me
          </a>
        </p>
      </div>
    </footer>
  );
}

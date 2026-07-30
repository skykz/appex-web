import { useState } from "react";
import { buildSigninUrl } from "@/lib/checkout-redirect";
import { legalPolicyHref, resolveLegalLang } from "@/lib/legal-lang";

const navLinks = [
  { label: "How it Works", href: "#how-it-works" },
  { label: "Courses", href: "#projects" },
  { label: "Reviews", href: "#reviews" },
  { label: "FAQ", href: "#faq" },
];

// Mobile sidebar keeps only the essentials — Reviews & FAQ, then Login + quiz CTA below.
const sidebarLinks = [
  { label: "Reviews", href: "#reviews" },
  { label: "FAQ", href: "#faq" },
];

/** Fixed top navigation with learner-app login and quiz CTA. */
export default function Navbar() {
  const [open, setOpen] = useState(false);
  const loginUrl = buildSigninUrl();
  const lang = resolveLegalLang();

  const handleLoginClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (loginUrl) return;
    e.preventDefault();
    window.alert("Sign-in is not configured yet. Set VITE_APP_URL on the USA landing deployment.");
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[100] h-[56px] md:h-[60px] bg-background/90 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-10" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        {/* Logo */}
        <a href="/" className="text-[20px] md:text-[22px] font-bold select-none tracking-tight">
          <span className="text-foreground">App</span>
          <span className="text-primary">ex</span>
        </a>

        {/* Center nav links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <a key={l.label} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 md:gap-4">
          <a
            href={loginUrl ?? "#"}
            onClick={handleLoginClick}
            className="hidden md:inline text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Login
          </a>
          <a
            href="/quiz"
            data-cta="navbar"
            className="relative overflow-hidden hidden md:inline-flex bg-gradient-primary text-white text-sm font-semibold rounded-full px-5 py-2.5 hover:opacity-90 transition-opacity"
          >
            {/* Light sweep left→right on a slow loop — keeps the nav CTA alive
                without moving the button itself. Decorative only. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-1/3 motion-reduce:hidden"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
                animation: "hero-cta-sweep 5s ease-in-out infinite",
              }}
            />
            <span className="relative z-10">Start free quiz →</span>
          </a>
          {/* Hamburger — mobile */}
          <button
            onClick={() => setOpen(true)}
            className="md:hidden text-foreground text-2xl leading-none"
            aria-label="Open menu"
          >
            ☰
          </button>
        </div>
      </nav>

      {/* Mobile sidebar */}
      {open && (
        <div className="fixed inset-0 z-[200]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="absolute top-0 right-0 h-full w-[280px] bg-card p-6 flex flex-col gap-1 animate-slide-in-right border-l border-border">
            {/* Top row: Appex logo + close button */}
            <div className="flex items-center justify-between mb-6">
              <a
                href="/"
                onClick={() => setOpen(false)}
                className="text-[22px] font-bold select-none tracking-tight"
              >
                <span className="text-foreground">App</span>
                <span className="text-primary">ex</span>
              </a>
              <button
                onClick={() => setOpen(false)}
                className="text-2xl text-foreground"
                aria-label="Close menu"
              >
                ✕
              </button>
            </div>
            {sidebarLinks.map((l) => (
              <a
                key={l.label}
                href={"newTab" in l && l.newTab ? legalPolicyHref(l.href, lang) : l.href}
                target={"newTab" in l && l.newTab ? "_blank" : undefined}
                rel={"newTab" in l && l.newTab ? "noopener noreferrer" : undefined}
                onClick={() => setOpen(false)}
                className="text-base text-foreground/80 py-2 hover:text-primary transition-colors"
              >
                {l.label}
              </a>
            ))}
            <a
              href={loginUrl ?? "#"}
              onClick={(e) => {
                handleLoginClick(e);
                setOpen(false);
              }}
              className="mt-4 rounded-full border border-border py-3 text-center font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              Log in
            </a>
            <a
              href="/quiz"
              data-cta="navbar_mobile"
              onClick={() => setOpen(false)}
              className="relative overflow-hidden mt-2 bg-gradient-primary text-white text-center rounded-full py-3 font-semibold hover:opacity-90 transition-opacity"
            >
              {/* Same left→right sweep as the desktop nav CTA. */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 motion-reduce:hidden"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)",
                  animation: "hero-cta-sweep 5s ease-in-out infinite",
                }}
              />
              <span className="relative z-10">Start free quiz →</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
}

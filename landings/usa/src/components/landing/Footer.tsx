const links = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Subscription Policy", href: "/subscription" },
  { label: "Terms & Conditions", href: "/terms" },
];

export default function Footer() {
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
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] md:text-sm text-muted-foreground hover:text-foreground transition-colors font-body"
            >
              {l.label}
            </a>
          ))}
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

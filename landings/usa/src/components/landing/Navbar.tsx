import { useState } from "react";

const navLinks = [
  { label: "How it Works", href: "#how-it-works" },
  { label: "Courses", href: "#projects" },
  { label: "Reviews", href: "#reviews" },
  { label: "FAQ", href: "#faq" },
];

const sidebarLinks = [
  ...navLinks,
  { label: "Login", href: "#" },
  { label: "Privacy Policy", href: "#" },
  { label: "Terms", href: "#" },
  { label: "Subscription Policy", href: "#" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[100] h-[56px] md:h-[60px] bg-background/90 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-10">
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
          <a href="#" className="hidden md:inline text-sm text-muted-foreground hover:text-foreground transition-colors">
            Login
          </a>
          <a
            href="/quiz"
            className="hidden md:inline-flex bg-gradient-primary text-white text-sm font-semibold rounded-full px-5 py-2.5 hover:opacity-90 transition-opacity"
          >
            Get your free plan →
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
            <button
              onClick={() => setOpen(false)}
              className="self-end text-2xl text-foreground mb-4"
              aria-label="Close menu"
            >
              ✕
            </button>
            {sidebarLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-base text-foreground/80 py-2 hover:text-primary transition-colors"
              >
                {l.label}
              </a>
            ))}
            <a
              href="/quiz"
              className="mt-4 bg-gradient-primary text-white text-center rounded-full py-3 font-semibold hover:opacity-90 transition-opacity"
            >
              Get your free plan →
            </a>
          </div>
        </div>
      )}
    </>
  );
}

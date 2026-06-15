/**
 * Friendly line-art illustration for outage / error screens — monitor glitch with a puzzled user.
 */
export function TechnicalDifficultiesIllustration() {
  return (
    <svg
      viewBox="0 0 420 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="mx-auto h-auto w-full max-w-md"
      aria-hidden
    >
      <ellipse cx="210" cy="300" rx="120" ry="10" fill="hsl(var(--muted))" />

      <rect x="118" y="88" width="184" height="128" rx="10" fill="hsl(var(--primary))" />
      <rect x="128" y="98" width="164" height="98" rx="6" fill="white" />
      <circle cx="210" cy="147" r="28" fill="hsl(var(--primary) / 0.15)" />
      <circle cx="210" cy="147" r="18" stroke="hsl(var(--primary))" strokeWidth="3" />
      <circle cx="203" cy="143" r="3" fill="hsl(var(--primary))" />
      <circle cx="217" cy="143" r="3" fill="hsl(var(--primary))" />
      <path
        d="M200 156c4 4 16 4 20 0"
        stroke="hsl(var(--primary))"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="188" y="216" width="44" height="34" rx="4" fill="hsl(var(--primary))" />
      <rect x="168" y="248" width="84" height="10" rx="5" fill="hsl(var(--primary))" />

      <path
        d="M286 118c10-8 24-6 30 6"
        stroke="hsl(var(--foreground))"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M292 96c6-10 18-12 26-4"
        stroke="hsl(var(--foreground))"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <circle cx="318" cy="112" r="22" stroke="hsl(var(--foreground))" strokeWidth="3" />
      <path
        d="M308 112c3-4 8-5 12-2M318 134v18"
        stroke="hsl(var(--foreground))"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M300 156c8 10 20 14 36 14"
        stroke="hsl(var(--foreground))"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M292 170h52"
        stroke="hsl(var(--foreground))"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M286 188c10 8 24 8 34 0"
        stroke="hsl(var(--foreground))"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M334 126l10-14"
        stroke="hsl(var(--foreground))"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M342 108l8 4-6 8"
        stroke="hsl(var(--foreground))"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M96 150l-14 8M88 178l-16 2"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M334 78l12-8M350 92l14-2"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

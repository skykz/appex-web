type IllustrationVariant = 'technical' | 'not-found'

interface TechnicalDifficultiesIllustrationProps {
  variant?: IllustrationVariant
}

const screenCopy: Record<IllustrationVariant, { code: string; sub: string; tab: string }> = {
  'not-found': { code: '404', sub: 'something went wrong...', tab: 'Oops!' },
  technical:   { code: '500', sub: 'please try again later...', tab: 'Uh oh' },
}

/**
 * Isometric-style error scene — monitor, desk, keyboard, ladder, and three mini figures.
 * All elements are constrained to the rounded-rect card (viewBox 0 0 560 430).
 */
export function TechnicalDifficultiesIllustration({
  variant = 'technical',
}: TechnicalDifficultiesIllustrationProps) {
  const { code, sub, tab } = screenCopy[variant]

  return (
    <div className="mx-auto w-full max-w-xl">
      <svg
        viewBox="0 0 560 430"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-auto w-full drop-shadow-md"
        aria-hidden
      >
        <defs>
          {/* Background gradient */}
          <linearGradient id="sc-bg" x1="10" y1="10" x2="550" y2="420" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="hsl(30 92% 62%)" />
            <stop offset="100%" stopColor="hsl(18 78% 46%)" />
          </linearGradient>

          {/* Monitor screen gradient */}
          <linearGradient id="sc-screen" x1="160" y1="72" x2="160" y2="236" gradientUnits="userSpaceOnUse">
            <stop offset="0%"   stopColor="hsl(22 62% 28%)" />
            <stop offset="100%" stopColor="hsl(18 56% 20%)" />
          </linearGradient>

          {/* Clip for screen content */}
          <clipPath id="sc-clip">
            <rect x="160" y="72" width="240" height="164" rx="5" />
          </clipPath>
        </defs>

        {/* ── Card background ── */}
        <rect x="10" y="10" width="540" height="410" rx="28" fill="url(#sc-bg)" />

        {/* ── Floating decorations ── */}
        <ellipse cx="80" cy="70" rx="26" ry="13" fill="white" fillOpacity="0.2" />
        <ellipse cx="108" cy="62" rx="13" ry="6" fill="white" fillOpacity="0.14" />
        <circle cx="450" cy="50" r="17" fill="white" fillOpacity="0.17" />
        <circle cx="476" cy="80" r="10" fill="white" fillOpacity="0.22" />
        <circle cx="424" cy="84" r="6"  fill="white" fillOpacity="0.15" />
        {/* Star */}
        <path
          d="M128 42l3.2 6.6 7.3 1.1-5.3 5.1 1.2 7.2L128 58.6l-6.4 3.4 1.2-7.2-5.3-5.1 7.3-1.1z"
          fill="white" fillOpacity="0.45"
        />
        {/* Rotated squares */}
        <rect x="474" y="120" width="12" height="12" rx="2" fill="white" fillOpacity="0.22" transform="rotate(22 480 126)" />
        <rect x="52"  y="132" width="10" height="10" rx="2" fill="white" fillOpacity="0.2"  transform="rotate(-16 57 137)" />

        {/* ── Monitor ── */}
        {/* Top face (depth) */}
        <path d="M152 66 L408 66 L430 42 L174 42 Z" fill="hsl(26 68% 40%)" />
        {/* Right face (depth) */}
        <path d="M408 66 L430 42 L430 232 L408 256 Z" fill="hsl(18 58% 32%)" />
        {/* Front face */}
        <rect x="152" y="66" width="256" height="190" rx="6" fill="hsl(22 64% 34%)" />
        {/* Screen glass */}
        <rect x="160" y="72" width="240" height="164" rx="5" fill="url(#sc-screen)" />

        {/* Browser tab bar */}
        <rect x="160" y="72" width="240" height="26" rx="5" fill="hsl(26 78% 48%)" />
        {/* Active tab */}
        <rect x="168" y="76" width="56" height="18" rx="4" fill="hsl(30 92% 62%)" />
        <text
          x="178" y="89"
          fill="hsl(18 55% 20%)"
          fontSize="10.5" fontWeight="700"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {tab}
        </text>
        {/* Hamburger lines (top-right corner of tab bar) */}
        <rect x="380" y="79"  width="15" height="2.5" rx="1.25" fill="white" fillOpacity="0.8" />
        <rect x="380" y="85"  width="15" height="2.5" rx="1.25" fill="white" fillOpacity="0.8" />
        <rect x="380" y="91"  width="15" height="2.5" rx="1.25" fill="white" fillOpacity="0.8" />

        {/* Screen text */}
        <g clipPath="url(#sc-clip)">
          <text
            x="174" y="173"
            fill="white"
            fontSize="70" fontWeight="800" letterSpacing="-2"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {code}
          </text>
          <text
            x="174" y="203"
            fill="white" fillOpacity="0.75"
            fontSize="13.5" fontWeight="500"
            fontFamily="Inter, system-ui, sans-serif"
          >
            {sub}
          </text>
        </g>

        {/* Monitor stand */}
        <path d="M257 256 L303 256 L310 282 L250 282 Z" fill="hsl(18 54% 24%)" />
        <path d="M222 282 L338 282 L346 296 L214 296 Z" fill="hsl(18 48% 20%)" />

        {/* ── Desk surface ── */}
        {/* Top face */}
        <path d="M44 312 L516 288 L516 334 L44 358 Z" fill="hsl(26 50% 46%)" fillOpacity="0.65" />
        {/* Front edge */}
        <path d="M44 358 L516 334 L516 346 L44 370 Z" fill="hsl(18 45% 30%)" fillOpacity="0.55" />

        {/* ── Keyboard ── */}
        {/* Top face */}
        <path d="M112 296 L356 278 L362 302 L118 320 Z" fill="hsl(0 0% 95%)" />
        {/* Left edge */}
        <path d="M112 296 L118 320 L118 329 L112 305 Z" fill="hsl(0 0% 78%)" />
        {/* Right edge */}
        <path d="M356 278 L362 302 L362 311 L356 287 Z" fill="hsl(0 0% 82%)" />
        {/* Key rows as dashed lines */}
        {[0, 1, 2, 3].map((row) => (
          <line
            key={row}
            x1={122 - row * 2} y1={289 + row * 9}
            x2={350 + row * 1} y2={272 + row * 8}
            stroke="hsl(210 12% 74%)"
            strokeWidth="1.8"
            strokeDasharray="5 3.5"
            strokeLinecap="round"
          />
        ))}

        {/* ── Mouse ── */}
        {/* Top face */}
        <path d="M374 284 L424 272 L428 294 L378 306 Z" fill="hsl(0 0% 95%)" />
        {/* Left edge */}
        <path d="M374 284 L378 306 L378 314 L374 292 Z" fill="hsl(0 0% 78%)" />
        {/* Center scroll divider */}
        <line x1="400" y1="271" x2="402" y2="293" stroke="hsl(0 0% 74%)" strokeWidth="1.5" strokeLinecap="round" />

        {/* ── Ladder ── */}
        <g stroke="white" strokeWidth="3" strokeLinecap="round" strokeOpacity="0.82">
          <line x1="108" y1="308" x2="128" y2="228" />
          <line x1="126" y1="308" x2="146" y2="228" />
          <line x1="111" y1="300" x2="143" y2="291" />
          <line x1="114" y1="284" x2="144" y2="276" />
          <line x1="117" y1="268" x2="145" y2="261" />
          <line x1="120" y1="252" x2="144" y2="246" />
        </g>

        {/* ── Mini cubes ── */}
        {/* Left cube */}
        <path d="M70 318 L86 310 L102 318 L86 326 Z" fill="hsl(214 60% 72%)" fillOpacity="0.55" />
        <path d="M70 318 L86 326 L86 336 L70 328 Z" fill="hsl(214 52% 58%)" fillOpacity="0.52" />
        <path d="M86 310 L102 318 L102 328 L86 336 Z" fill="hsl(214 46% 50%)" fillOpacity="0.5"  />
        {/* Right cube */}
        <path d="M444 304 L458 297 L472 304 L458 311 Z" fill="hsl(214 60% 72%)" fillOpacity="0.48" />
        <path d="M444 304 L458 311 L458 319 L444 312 Z" fill="hsl(214 52% 58%)" fillOpacity="0.45" />
        <path d="M458 297 L472 304 L472 312 L458 319 Z" fill="hsl(214 46% 50%)" fillOpacity="0.42" />

        {/* ── Figure 1 — sitting on keyboard, reading ── */}
        {/* head */}
        <circle cx="200" cy="264" r="9.5" fill="hsl(28 42% 86%)" />
        {/* shirt */}
        <path d="M192 273 L208 273 L206 289 L194 289 Z" fill="hsl(218 48% 36%)" />
        {/* legs */}
        <path d="M194 289 L199 289 L199 302 L194 302 Z" rx="2" fill="hsl(218 32% 28%)" />
        <path d="M201 289 L206 289 L206 302 L201 302 Z" rx="2" fill="hsl(218 32% 28%)" />

        {/* ── Figure 2 — center, holding tablet ── */}
        <circle cx="298" cy="258" r="9.5" fill="hsl(28 42% 86%)" />
        <path d="M290 267 L306 267 L304 283 L292 283 Z" fill="hsl(24 88% 56%)" />
        <path d="M292 283 L297 283 L297 296 L292 296 Z" rx="2" fill="hsl(218 32% 28%)" />
        <path d="M299 283 L304 283 L304 296 L299 296 Z" rx="2" fill="hsl(218 32% 28%)" />
        {/* tablet in hand */}
        <rect x="309" y="262" width="12" height="17" rx="2" fill="hsl(220 16% 90%)" />
        <rect x="311" y="264" width="8"  height="11" rx="1" fill="hsl(212 38% 70%)" />

        {/* ── Figure 3 — right, with gear ── */}
        <circle cx="392" cy="252" r="9.5" fill="hsl(28 42% 86%)" />
        <path d="M384 261 L400 261 L398 276 L386 276 Z" fill="hsl(218 48% 36%)" />
        <path d="M386 276 L391 276 L391 289 L386 289 Z" rx="2" fill="hsl(218 32% 28%)" />
        <path d="M393 276 L398 276 L398 289 L393 289 Z" rx="2" fill="hsl(218 32% 28%)" />
        {/* gear badge */}
        <circle cx="415" cy="250" r="13"  fill="hsl(30 90% 60%)" />
        <circle cx="415" cy="250" r="5.5" fill="hsl(18 54% 24%)" />
        {/* gear teeth */}
        <rect x="412.5" y="234" width="5" height="5" rx="1" fill="hsl(30 90% 60%)" />
        <rect x="412.5" y="261" width="5" height="5" rx="1" fill="hsl(30 90% 60%)" />
        <rect x="399"   y="247.5" width="5" height="5" rx="1" fill="hsl(30 90% 60%)" />
        <rect x="426"   y="247.5" width="5" height="5" rx="1" fill="hsl(30 90% 60%)" />
      </svg>
    </div>
  )
}

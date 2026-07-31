import { useEffect, useState } from "react";
// Hero-only photos. Kept separate from the `paywall-after*.webp` pair, which the
// paywall still uses as the "your future self" images after the quiz.
import heroLearnerFemale from "@/assets/hero-learner-female.webp";
import heroLearnerMale from "@/assets/hero-learner-male.webp";

/* ── AI provider logos ── */
function ChatGPTLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 41 41" fill="none">
      <path
        d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835A9.964 9.964 0 0 0 18.306.5a10.079 10.079 0 0 0-9.614 6.977 9.967 9.967 0 0 0-6.664 4.834 10.08 10.08 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 7.516 3.35 10.078 10.078 0 0 0 9.617-6.981 9.967 9.967 0 0 0 6.663-4.834 10.079 10.079 0 0 0-1.243-11.813ZM22.498 37.886a7.474 7.474 0 0 1-4.799-1.735c.061-.033.168-.091.237-.134l7.964-4.6a1.294 1.294 0 0 0 .655-1.134v-11.231l3.366 1.945a.12.12 0 0 1 .066.092v9.299a7.505 7.505 0 0 1-7.49 7.498Zm-16.114-6.881a7.471 7.471 0 0 1-.894-5.023c.06.036.165.1.24.143l7.964 4.6a1.297 1.297 0 0 0 1.308 0l9.724-5.614v3.888a.12.12 0 0 1-.048.103l-8.051 4.649a7.504 7.504 0 0 1-10.243-2.746ZM4.288 13.769a7.471 7.471 0 0 1 3.896-3.288c0 .069-.004.19-.004.274v9.201a1.294 1.294 0 0 0 .654 1.132l9.723 5.614-3.366 1.944a.12.12 0 0 1-.114.01L7.04 23.998a7.504 7.504 0 0 1-2.752-10.228Zm27.658 6.437L22.224 14.59l3.366-1.943a.12.12 0 0 1 .113-.01l8.037 4.642a7.498 7.498 0 0 1-1.158 13.528v-9.476a1.293 1.293 0 0 0-.65-1.122Zm3.35-5.043c-.059-.037-.164-.1-.239-.144l-7.964-4.599a1.298 1.298 0 0 0-1.308 0l-9.723 5.614v-3.888a.12.12 0 0 1 .048-.103l8.05-4.645a7.497 7.497 0 0 1 11.135 7.765Zm-21.063 6.929-3.367-1.944a.12.12 0 0 1-.065-.092v-9.299a7.497 7.497 0 0 1 12.293-5.756 6.94 6.94 0 0 0-.236.134l-7.965 4.6a1.294 1.294 0 0 0-.654 1.132l-.005 11.225Zm1.829-3.943 4.33-2.501 4.332 2.5v5l-4.331 2.5-4.331-2.5V18.15Z"
        fill="#0D0D0D"
      />
    </svg>
  );
}

/* Gemini — 4-pointed star with Google's blue→purple gradient.
   Uses a per-instance unique gradient id so multiple copies on one page don't
   collide (duplicate SVG ids were making later instances render invisible). */
let geminiGradientSeq = 0
function GeminiLogo({ size = 36 }: { size?: number }) {
  const gradId = `gem-grad-${(geminiGradientSeq += 1)}`
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={gradId} x1="2" y1="4" x2="22" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="55%" stopColor="#9168F0" />
          <stop offset="100%" stopColor="#D96570" />
        </linearGradient>
      </defs>
      <path
        d="M12 2c.25 3.7 1.3 6.4 3.3 8.4 2 2 4.7 3.05 8.4 3.3v.6c-3.7.25-6.4 1.3-8.4 3.3-2 2-3.05 4.7-3.3 8.4h-.6c-.25-3.7-1.3-6.4-3.3-8.4-2-2-4.7-3.05-8.4-3.3v-.6c3.7-.25 6.4-1.3 8.4-3.3 2-2 3.05-4.7 3.3-8.4h.6Z"
        fill={`url(#${gradId})`}
      />
    </svg>
  );
}

/* Claude (Anthropic) — exact 10-spoke asterisk with rounded pill spokes */
function ClaudeLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {Array.from({ length: 10 }, (_, i) => (
        <rect
          key={i}
          x="46"
          y="10"
          width="8"
          height="34"
          rx="4"
          fill="#CC785C"
          transform={`rotate(${i * 36} 50 50)`}
        />
      ))}
    </svg>
  );
}

/* ── Trustpilot-style rating — temporarily disabled (kept in code) ──
   Re-enable by restoring TrustSquare + TrustpilotRating and the <TrustpilotRating/> usage below.
   (Definitions removed from the active tree to avoid unused-symbol build errors while hidden.) */

/**
 * Short phrases that drift out from behind the hero CTA.
 *
 * Deliberately motivational rather than scarcity-based: claims like "only 2
 * spots left" or "don't miss out" are fabricated urgency, which the FTC treats
 * as a deceptive practice and Meta flags on paid traffic. These say the same
 * emotional thing without asserting anything untrue.
 */
const CTA_BUBBLES = [
  "Your time ⏳",
  "It's the future 🚀",
  "Start today ✨",
  "No experience needed 💡",
  "10 min a day ☕",
  "Built for you 🎯",
  "Free to start 🔓",
  "Real skills 🛠",
] as const;

/**
 * Drift directions. Every bubble starts centred on the button and travels
 * outward, so it reads as emerging from behind the CTA. The layer sits *under*
 * the button (z-0 vs the button's z-10), which is what hides the first frames.
 */
const BUBBLE_SLOTS = [
  { bx: "-150px", by: "-58px", rot: "-7deg" },
  { bx: "150px", by: "-52px", rot: "6deg" },
  { bx: "-138px", by: "52px", rot: "5deg" },
  { bx: "142px", by: "58px", rot: "-6deg" },
];

/**
 * Emits one bubble every few seconds from a rotating slot with a random phrase,
 * so the sequence never reads as a fixed loop. Hidden from assistive tech and
 * disabled under `prefers-reduced-motion`.
 */
function HeroCtaBubbles() {
  const [bubbles, setBubbles] = useState<
    Array<{ id: number; text: string; slot: (typeof BUBBLE_SLOTS)[number] }>
  >([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let n = 0;
    const emit = () => {
      const id = Date.now() + n;
      const slot = BUBBLE_SLOTS[n % BUBBLE_SLOTS.length];
      // Offset the phrase index from the slot index so text and position don't
      // advance in lockstep — otherwise the same pairing repeats every cycle.
      const text = CTA_BUBBLES[(n * 3 + Math.floor(Math.random() * 3)) % CTA_BUBBLES.length];
      n += 1;
      setBubbles((prev) => [...prev, { id, text, slot }]);
      // Drop it after the animation so the DOM doesn't grow without bound.
      window.setTimeout(() => {
        setBubbles((prev) => prev.filter((b) => b.id !== id));
      }, 4200);
    };

    const first = window.setTimeout(emit, 1200);
    const iv = window.setInterval(emit, 2600);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(iv);
    };
  }, []);

  return (
    // z-0: the layer sits behind the button (z-10), so bubbles are concealed at
    // the start of their travel and appear to slide out from underneath it.
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
      {bubbles.map((b) => (
        <span
          key={b.id}
          // Centred on the button, then translated outward by the keyframe.
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] md:text-[12px] font-bold"
          style={{
            color: "#C2410C",
            background: "rgba(255,247,237,0.95)",
            border: "1px solid #FED7AA",
            boxShadow: "0 6px 16px -8px rgba(249,115,22,0.5)",
            ["--bx" as string]: b.slot.bx,
            ["--by" as string]: b.slot.by,
            ["--rot" as string]: b.slot.rot,
            animation: "hero-bubble-float 4s ease-out forwards",
          }}
        >
          {b.text}
        </span>
      ))}
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative bg-background pt-[88px] md:pt-[120px] pb-12 md:pb-24 px-4 sm:px-6 md:px-10 overflow-hidden">

      <div className="relative max-w-6xl mx-auto">
        {/* Floating elements */}

        {/* Top-left photo — desktop only so mobile stays centered without overflow */}
        <div className="hidden md:block absolute left-0 top-8 lg:top-12 z-20 animate-[fade-up_0.8s_ease-out_0.1s_both]">
          <div
            className="rounded-2xl md:rounded-[28px] overflow-hidden shadow-card-lg -rotate-[8deg] hover:rotate-0 transition-transform duration-500 w-[90px] h-[100px] md:w-[230px] md:h-[250px]"
            style={{ border: "3px solid white" }}
          >
            <img src={heroLearnerFemale} alt="Appex learner" className="w-full h-full object-cover" fetchPriority="high" decoding="async" width={460} height={500} />
          </div>
        </div>

        {/* Mid-right: ChatGPT bubble (desktop only) */}
        <div className="hidden lg:flex absolute right-2 top-[180px] z-20 items-center justify-center w-[72px] h-[72px] rounded-full bg-white shadow-card animate-[float_4s_ease-in-out_infinite]" style={{ border: "1px solid hsl(var(--border))" }}>
          <ChatGPTLogo size={36} />
        </div>

        {/* Right side photo — desktop only */}
        <div className="hidden md:block absolute right-0 bottom-40 lg:bottom-24 z-20 animate-[fade-up_0.8s_ease-out_0.3s_both]">
          <div
            className="rounded-2xl md:rounded-[28px] overflow-hidden shadow-card-lg rotate-[6deg] hover:rotate-0 transition-transform duration-500 w-[90px] h-[100px] md:w-[260px] md:h-[230px]"
            style={{ border: "3px solid white" }}
          >
            <img src={heroLearnerMale} alt="Appex learner" className="w-full h-full object-cover" fetchPriority="high" decoding="async" width={520} height={460} />
          </div>
        </div>

        {/* Bottom-left: certificate card with ChatGPT logo */}
        <div className="hidden md:block absolute left-2 bottom-12 lg:bottom-6 z-20 animate-[fade-up_0.8s_ease-out_0.4s_both]">
          <div
            className="rounded-2xl bg-white p-4 shadow-[0_20px_50px_-15px_rgba(249,115,22,0.25)] -rotate-[5deg]"
            style={{ width: 260, border: "1px solid hsl(var(--border))" }}
          >
            <div className="flex items-start justify-between mb-3">
              <ChatGPTLogo size={34} />
              <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">2026</span>
            </div>
            <p className="text-[11px] uppercase tracking-[0.15em] font-bold text-foreground mb-1">CERTIFICATE OF ACHIEVEMENT</p>
            <div className="h-px bg-border my-2" />
            <p className="text-[10px] text-muted-foreground mb-1">The certificate was awarded to</p>
            <p className="text-[14px] font-extrabold text-foreground mb-2">DEAR LEARNER</p>
            <p className="text-[9px] leading-snug text-muted-foreground line-clamp-3">
              Has successfully finished the <span className="font-semibold text-foreground">Claude AI Mastery</span> program — gaining strong real-world skills in AI prompting, automation, and applied workflows.
            </p>
            <div className="mt-3 flex justify-between items-end">
              <div>
                <div className="w-20 h-px bg-foreground/30 mb-1" />
                <p className="text-[8px] text-muted-foreground">Course Instructor</p>
              </div>
              {/* Award seal */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center relative" style={{ background: "radial-gradient(circle, #F97316 0%, #EA580C 100%)" }}>
                <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                  <path d="M12 2L9 9l-7 .75L7.5 14l-2 7L12 17.27 18.5 21l-2-7 5.5-4.25L15 9z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom-left: Gemini logo bubble — beside certificate, above overlapping layers */}
        <div className="hidden md:flex absolute left-[200px] md:left-[280px] lg:left-[300px] bottom-4 md:bottom-8 lg:bottom-10 z-30 items-center justify-center w-[60px] h-[60px] md:w-[72px] md:h-[72px] rounded-full bg-white shadow-[0_15px_40px_-10px_rgba(0,0,0,0.15)] animate-[float_4.5s_ease-in-out_infinite]" style={{ border: "1px solid hsl(var(--border))" }}>
          <GeminiLogo size={36} />
        </div>

        {/* Bottom-right: animated arrow — aligned with Gemini, above the right photo */}
        <div className="hidden md:block absolute right-[6%] md:right-[10%] lg:right-[14%] bottom-4 md:bottom-8 lg:bottom-10 z-30 animate-[float_3s_ease-in-out_infinite]">
          <svg width="56" height="56" viewBox="0 0 60 60" fill="none">
            <path
              d="M10 30 L45 30 M30 15 L45 30 L30 45"
              stroke="#F97316"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Mobile-only photo + logo collage — the desktop floats these absolutely,
            which can't fit a narrow screen, so on mobile we show them in normal flow. */}
        <div className="md:hidden flex items-center justify-center gap-3 pt-2 pb-6 animate-[fade-up_0.8s_ease-out_0.1s_both]">
          <div
            className="rounded-2xl overflow-hidden shadow-card-lg -rotate-[8deg] w-[104px] h-[124px] shrink-0"
            style={{ border: "3px solid white" }}
          >
            <img src={heroLearnerFemale} alt="Appex learner" className="w-full h-full object-cover" loading="eager" decoding="async" width={208} height={248} />
          </div>
          <div className="flex flex-col gap-3 shrink-0">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-card" style={{ border: "1px solid hsl(var(--border))" }}>
              <ChatGPTLogo size={28} />
            </div>
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white shadow-card" style={{ border: "1px solid hsl(var(--border))" }}>
              <GeminiLogo size={28} />
            </div>
          </div>
          <div
            className="rounded-2xl overflow-hidden shadow-card-lg rotate-[6deg] w-[104px] h-[124px] shrink-0"
            style={{ border: "3px solid white" }}
          >
            <img src={heroLearnerMale} alt="Appex learner" className="w-full h-full object-cover" loading="eager" decoding="async" width={208} height={248} />
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 text-center max-w-3xl mx-auto pt-0 md:pt-12 pb-16 md:pb-24 px-2">
          {/* Claude logo above headline */}
          <div className="inline-flex items-center justify-center mb-6 md:mb-8 w-16 h-16 md:w-20 md:h-20 rounded-full bg-white shadow-[0_15px_40px_-10px_rgba(218,119,86,0.4)]" style={{ border: "1px solid hsl(var(--border))" }}>
            <ClaudeLogo size={42} />
          </div>

          <h1
            className="text-foreground font-extrabold leading-[1.05] tracking-tight mb-5 md:mb-6"
            style={{ fontSize: "clamp(36px, 6.5vw, 76px)" }}
          >
            Master <span className="text-primary">AI Skills</span>
            <br />
            of the Future
          </h1>

          <p className="text-muted-foreground text-[16px] md:text-[19px] mb-8 md:mb-10 max-w-xl mx-auto font-body">
            Build AI skills that every role now demands
          </p>

          {/* CTA with an ambient attention loop: drifting bubbles behind it, a
              slow breathe, an expanding ring and a light sweep. All decorative
              and `pointer-events-none`, so the link stays the only hit target. */}
          <div className="relative inline-flex items-center justify-center">
            <HeroCtaBubbles />

            {/* Expanding ring, fires on the same cadence as the breathe */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full motion-reduce:hidden"
              style={{
                border: "2px solid rgba(249,115,22,0.55)",
                animation: "hero-cta-pulse 5s ease-out infinite",
              }}
            />

            <a
              href="/quiz"
              data-cta="hero"
              className="relative z-10 overflow-hidden inline-flex items-center justify-center gap-1.5 bg-primary text-white rounded-full px-6 md:px-7 py-2.5 md:py-3.5 text-[13px] md:text-[14px] font-semibold shadow-[0_15px_40px_-10px_rgba(249,115,22,0.5)] hover:opacity-90 hover:-translate-y-0.5 transition-all motion-reduce:animate-none"
              style={{ animation: "hero-cta-breathe 5s ease-in-out infinite" }}
            >
              {/* Light sweep across the button face */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 motion-reduce:hidden"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.38), transparent)",
                  animation: "hero-cta-sweep 5s ease-in-out infinite",
                }}
              />
              <span className="relative z-10 inline-flex items-center gap-1.5">
                Start now
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </span>
            </a>
          </div>

          {/* Trustpilot rating — temporarily hidden (kept in code) */}
          {/* <div className="relative z-20 mt-10 md:mt-12">
            <TrustpilotRating rating={4.5} reviews={2143} />
          </div> */}
        </div>
      </div>
    </section>
  );
}

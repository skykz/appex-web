import paywallAfter from "@/assets/paywall-after.webp";
import paywallAfterMale from "@/assets/paywall-after-male.webp";

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

/* Gemini — official 4-pointed star with 4-corner color gradient */
function GeminiLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="-4 -1 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        {/* Simulates the conic gradient: red top, blue right, green bottom, yellow left */}
        <linearGradient id="gem-tb" x1="14" y1="0" x2="14" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#EA4335" />
          <stop offset="50%" stopColor="#34A853" />
          <stop offset="100%" stopColor="#34A853" />
        </linearGradient>
        <linearGradient id="gem-lr" x1="0" y1="14" x2="28" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FBBC05" />
          <stop offset="50%" stopColor="#9C62E0" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#4285F4" />
        </linearGradient>
        <filter id="gem-blend">
          <feBlend in="SourceGraphic" in2="BackgroundImage" mode="screen" />
        </filter>
      </defs>
      {/* Star path — top/bottom half */}
      <path
        d="M14 0.5C14.38 5.8 15.9 9.5 18.6 12.2C21.3 14.9 25 16.4 30.3 16.8C25 17.2 21.3 18.7 18.6 21.4C15.9 24.1 14.38 27.8 14 33.1C13.62 27.8 12.1 24.1 9.4 21.4C6.7 18.7 3 17.2 -2.3 16.8C3 16.4 6.7 14.9 9.4 12.2C12.1 9.5 13.62 5.8 14 0.5Z"
        fill="url(#gem-tb)"
      />
      {/* Star path — left/right half overlay */}
      <path
        d="M14 0.5C14.38 5.8 15.9 9.5 18.6 12.2C21.3 14.9 25 16.4 30.3 16.8C25 17.2 21.3 18.7 18.6 21.4C15.9 24.1 14.38 27.8 14 33.1C13.62 27.8 12.1 24.1 9.4 21.4C6.7 18.7 3 17.2 -2.3 16.8C3 16.4 6.7 14.9 9.4 12.2C12.1 9.5 13.62 5.8 14 0.5Z"
        fill="url(#gem-lr)"
        style={{ mixBlendMode: 'multiply' }}
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
            <img src={paywallAfter} alt="Appex learner" className="w-full h-full object-cover" fetchPriority="high" decoding="async" width={460} height={500} />
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
            <img src={paywallAfterMale} alt="Appex learner" className="w-full h-full object-cover" fetchPriority="high" decoding="async" width={520} height={460} />
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

        {/* Center content */}
        <div className="relative z-10 text-center max-w-3xl mx-auto pt-8 md:pt-12 pb-16 md:pb-24 px-2">
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

          <a
            href="/quiz"
            className="inline-flex items-center justify-center gap-2 bg-primary text-white rounded-full px-8 md:px-10 py-4 md:py-5 text-[16px] md:text-[18px] font-semibold shadow-[0_15px_40px_-10px_rgba(249,115,22,0.5)] hover:opacity-90 hover:-translate-y-0.5 transition-all"
          >
            Start now
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </a>

          {/* Star rating only */}
          <div className="relative z-20 mt-10 md:mt-12 flex items-center justify-center gap-2">
            <div className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <svg key={i} className="w-5 h-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.366 2.446a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.365-2.446a1 1 0 00-1.176 0l-3.366 2.446c-.784.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.075 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                </svg>
              ))}
            </div>
            <span className="text-foreground text-[14px] font-bold">4.8 out of 5</span>
          </div>
        </div>
      </div>
    </section>
  );
}

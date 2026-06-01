const features = [
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
      </svg>
    ),
    title: "Start with zero experience",
    desc: "Master Claude through plain-language prompting and no-code workflows. No tech background needed.",
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: "Go beyond basic prompts",
    desc: "Learn the real techniques professionals use to get reliable, high-quality work from Claude.",
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
    title: "Practice on real work",
    desc: "Apply Claude to genuine, hands-on tasks and build a portfolio as you learn.",
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
      </svg>
    ),
    title: "Earn a real certification",
    desc: "Finish with an Appex AI Certification that proves your Claude skills to clients and employers.",
  },
];

function PhoneMockup() {
  return (
    <div className="relative w-full max-w-[340px] mx-auto px-4 sm:px-0 opacity-0 animate-[fade-up_0.8s_ease-out_0.2s_forwards]">
      {/* Floating: streak */}
      <div
        className="absolute -top-3 -left-2 z-10 flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold text-foreground"
        style={{ background: "#1A1A1A", border: "1px solid rgba(249,115,22,0.3)" }}
      >
        <span className="text-base">🔥</span> 7-day streak
      </div>

      {/* Phone frame */}
      <div
        className="rounded-[42px] p-3"
        style={{
          background: "#0A0A0A",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 40px 80px -30px rgba(249,115,22,0.25)",
        }}
      >
        <div className="rounded-[32px] p-5" style={{ background: "#131313" }}>
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-[11px] font-body" style={{ color: "#888" }}>Good morning</p>
              <p className="text-foreground text-[17px] font-bold tracking-tight">Your Claude path</p>
            </div>
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-background text-[13px] font-bold bg-primary">
              J
            </div>
          </div>

          {/* Progress card */}
          <div
            className="rounded-2xl p-4 mb-5"
            style={{ background: "linear-gradient(135deg, #F97316, #FFB800)" }}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-background text-[12px] font-semibold">Overall progress</span>
              <span className="text-background text-[15px] font-extrabold">68%</span>
            </div>
            <div className="w-full h-1.5 rounded-full mb-3" style={{ background: "rgba(13,13,13,0.25)" }}>
              <div className="h-1.5 rounded-full bg-background" style={{ width: "68%" }} />
            </div>
            <p className="text-background/80 text-[11px] font-body">Module 4 of 6 · Claude for real work</p>
          </div>

          {/* Today's lessons */}
          <p className="text-[10px] tracking-[0.18em] uppercase font-bold mb-2.5" style={{ color: "#888" }}>
            Today's lessons
          </p>
          <div className="flex flex-col gap-2 mb-4">
            {/* Done */}
            <div
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/15">
                <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span className="text-[13px] line-through font-body" style={{ color: "#666" }}>Prompting foundations</span>
            </div>
            {/* Active */}
            <div
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{ background: "#0f0f0f", border: "1px solid rgba(249,115,22,0.4)" }}
            >
              <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary">
                <svg className="w-3.5 h-3.5 text-background" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              <div className="flex-1">
                <p className="text-[13px] font-bold text-foreground leading-tight">Writing client proposals</p>
                <p className="text-[10.5px] font-body" style={{ color: "#888" }}>Lesson 3 of 6 · 12 min</p>
              </div>
            </div>
            {/* Locked */}
            <div
              className="flex items-center gap-3 rounded-xl px-3 py-2.5"
              style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.05)" }}
            >
              <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#1A1A1A" }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth={2}>
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              </span>
              <span className="text-[13px] font-body" style={{ color: "#666" }}>Automate your inbox</span>
            </div>
          </div>

          {/* CTA */}
          <div className="bg-gradient-primary rounded-xl py-3 text-center text-white text-[13px] font-semibold">
            Continue learning
          </div>
        </div>
      </div>

      {/* Floating: certificate */}
      <div
        className="absolute -bottom-3 -right-2 flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold text-foreground"
        style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="8" r="6" />
          <path d="M15.5 13.5L17 22l-5-3-5 3 1.5-8.5" />
        </svg>
        Certificate · 80%
      </div>
    </div>
  );
}

export default function Features() {
  return (
    <section className="bg-background relative py-16 md:py-24 px-4 md:px-10">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Left — copy */}
        <div>
          <div className="inline-block mb-5 rounded-full px-4 py-1.5 text-[11px] font-bold tracking-[0.15em] uppercase text-primary" style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)" }}>
            Why Appex
          </div>
          <h2
            className="text-foreground font-extrabold leading-[1.1] tracking-tight mb-5"
            style={{ fontSize: "clamp(28px, 4.2vw, 48px)" }}
          >
            The fastest way to <br className="hidden md:block" />
            genuinely <span className="text-primary">master Claude</span>
          </h2>
          <p className="text-muted-foreground text-[15px] md:text-[16px] leading-relaxed mb-8 md:mb-10 font-body max-w-lg">
            No abstract theory. Every lesson is built to get you using Claude for real work and the future-ready skills to stay ahead.
          </p>

          <div className="flex flex-col gap-6 md:gap-7 mb-8 md:mb-10">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4 items-start">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-primary"
                  style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)" }}
                >
                  {f.icon}
                </div>
                <div>
                  <h3 className="text-foreground font-bold text-base md:text-[17px] mb-1 tracking-tight">{f.title}</h3>
                  <p className="text-muted-foreground text-[13.5px] md:text-[14.5px] leading-[1.6] font-body max-w-md">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <a
            href="/quiz"
            className="inline-flex justify-center bg-gradient-primary text-white rounded-xl px-7 py-3.5 text-base font-semibold hover:opacity-90 hover:-translate-y-px transition-all"
          >
            Start Free Quiz →
          </a>
        </div>

        {/* Right — phone mockup */}
        <div className="relative">
          <PhoneMockup />
        </div>
      </div>
    </section>
  );
}

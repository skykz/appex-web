const features = [
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
      </svg>
    ),
    title: "No background? Even better.",
    desc: "We start at zero and build up. If you can write an email, you can master Claude — no coding, no jargon.",
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: "Skills the pros actually use",
    desc: "Skip the surface-level tricks. Learn the prompting patterns and workflows that get consistent, expert-level results.",
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
    title: "Learn by doing, not watching",
    desc: "Every module ends with a real task you actually complete — so your portfolio grows alongside your skills.",
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z" />
      </svg>
    ),
    title: "Walk away with credentials",
    desc: "Cap it off with an Appex AI Certificate — the kind of proof clients and hiring managers actually recognize.",
  },
];

/* Mini Claude logo for chat header (terracotta asterisk) */
function ChatClaudeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 100 100" fill="none">
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

function PhoneMockup() {
  return (
    <div className="relative w-full max-w-[340px] mx-auto px-4 sm:px-0 overflow-hidden opacity-0 animate-[fade-up_0.8s_ease-out_0.2s_forwards]">
      {/* Floating: "Live demo" badge */}
      <div
        className="absolute top-0 left-4 z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold bg-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.15)]"
        style={{ border: "1px solid hsl(var(--border))", color: "#0D0D0D" }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        Live with Claude
      </div>

      {/* Browser-style frame (chat window) */}
      <div
        className="rounded-2xl bg-white overflow-hidden"
        style={{
          border: "1px solid hsl(var(--border))",
          boxShadow: "0 40px 80px -30px rgba(249,115,22,0.20)",
        }}
      >
        {/* Browser top bar */}
        <div className="flex items-center gap-1.5 px-3 py-2.5 border-b" style={{ borderColor: "hsl(var(--border))", background: "#FAFAFA" }}>
          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1.5 px-3 py-0.5 rounded-md bg-white" style={{ border: "1px solid hsl(var(--border))" }}>
              <ChatClaudeIcon />
              <span className="text-[10px] font-semibold text-foreground">claude.ai</span>
            </div>
          </div>
        </div>

        {/* Chat conversation */}
        <div className="p-4 space-y-4">
          {/* User message */}
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold bg-primary flex-shrink-0">
              J
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-[12px] font-semibold text-foreground mb-1">You</p>
              <div className="rounded-lg rounded-tl-sm px-3 py-2 text-[12.5px] leading-snug" style={{ background: "#F4F4F5", color: "#0D0D0D" }}>
                Write a client proposal for a $4K AI automation project — agency-style, friendly but professional.
              </div>
            </div>
          </div>

          {/* Claude response */}
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(204,120,92,0.12)" }}>
              <ChatClaudeIcon />
            </div>
            <div className="flex-1 pt-0.5">
              <p className="text-[12px] font-semibold text-foreground mb-1">Claude</p>
              <div className="space-y-2">
                <p className="text-[12px] leading-snug text-foreground">
                  Here's a proposal you can send today:
                </p>
                <div className="rounded-lg p-2.5" style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}>
                  <p className="text-[10.5px] font-bold text-foreground mb-1.5 tracking-tight">Project Proposal — AI Workflow Setup</p>
                  <div className="space-y-1">
                    <div className="flex items-start gap-1.5 text-[10.5px] leading-snug">
                      <span className="text-primary flex-shrink-0 font-bold">·</span>
                      <span className="text-foreground">Scope: 3 Claude-powered workflows</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-[10.5px] leading-snug">
                      <span className="text-primary flex-shrink-0 font-bold">·</span>
                      <span className="text-foreground">Timeline: 2 weeks · 2 milestones</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-[10.5px] leading-snug">
                      <span className="text-primary flex-shrink-0 font-bold">·</span>
                      <span className="text-foreground">Investment: <strong>$4,000</strong> (50% upfront)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action chips */}
              <div className="flex gap-1.5 mt-2.5">
                <button className="text-[10.5px] font-medium px-2.5 py-1 rounded-md border" style={{ borderColor: "hsl(var(--border))", color: "#0D0D0D" }}>
                  📋 Copy
                </button>
                <button className="text-[10.5px] font-medium px-2.5 py-1 rounded-md border" style={{ borderColor: "hsl(var(--border))", color: "#0D0D0D" }}>
                  ✨ Refine
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Input field */}
        <div className="px-3 pb-3">
          <div
            className="flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: "#FAFAFA", border: "1px solid hsl(var(--border))" }}
          >
            <span className="text-muted-foreground text-[12px] flex-1">Reply to Claude…</span>
            <button className="w-6 h-6 rounded-md flex items-center justify-center bg-primary">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Floating: stat badge */}
      <div
        className="absolute bottom-0 right-2 flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-semibold bg-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.15)]"
        style={{ border: "1px solid hsl(var(--border))", color: "#0D0D0D" }}
      >
        <svg className="w-3.5 h-3.5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8M13 12h8M13 17h8M3 7l3 3 5-5M3 14l3 3 5-5" />
        </svg>
        Sent in 12 sec
      </div>
    </div>
  );
}

export default function Features() {
  return (
    <section className="bg-background relative py-16 md:py-24 px-4 md:px-10">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Left — copy */}
        <div className="text-center md:text-left">
          <div className="inline-block mb-5 rounded-full px-4 py-1.5 text-[11px] font-bold tracking-[0.15em] uppercase text-primary" style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)" }}>
            The Appex method
          </div>
          <h2
            className="text-foreground font-extrabold leading-[1.1] tracking-tight mb-5"
            style={{ fontSize: "clamp(28px, 4.2vw, 48px)" }}
          >
            Skip the theory. <br className="hidden md:block" />
            <span className="text-primary">Learn what works.</span>
          </h2>
          <p className="text-muted-foreground text-[15px] md:text-[16px] leading-relaxed mb-8 md:mb-10 font-body max-w-lg">
            Forget endless videos and dense textbooks. Every Appex lesson is built around what you'll actually do with Claude tomorrow — and the kind of work that pays.
          </p>

          <div className="flex flex-col gap-6 md:gap-7 mb-8 md:mb-10 items-center md:items-stretch">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4 items-start text-left max-w-md md:max-w-none">
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
            data-cta="features"
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

const skills = [
  ["AI Bots & Automations", "Monetize AI Agents"],
  ["OpenClaw Framework", "N8N Workflows"],
  ["Client Acquisition", "AI Agent Building"],
  ["Sales & Outreach", ""],
];

export default function Certificate() {
  return (
    <section className="bg-card py-16 md:py-24 px-4 md:px-10">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-10 lg:gap-16 items-center">
        {/* Left — certificate mockup (landscape) */}
        <div className="flex-1 flex justify-center w-full">
          <div className="relative w-full max-w-[560px]">
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 via-transparent to-primary/10 rounded-2xl blur-xl" />

            <div className="relative bg-foreground rounded-xl w-full shadow-2xl shadow-black/40 overflow-hidden">
              {/* Header bar */}
              <div className="bg-background px-8 py-5 text-center">
                <p className="text-foreground font-bold text-lg md:text-2xl tracking-wider">
                  CERTIFICATE OF ACHIEVEMENT
                </p>
              </div>

              <div className="px-8 md:px-12 py-6 md:py-8 text-center">
                <p className="text-[#777] text-xs md:text-sm mb-2 font-body">
                  The certificate was awarded to
                </p>

                <div className="border-b border-[#E8E4DC] pb-3 mb-3">
                  <p className="text-2xl md:text-3xl font-bold text-background tracking-tight">
                    DEAR USER
                  </p>
                </div>

                <p className="text-[#777] text-xs md:text-sm leading-relaxed mb-5 font-body max-w-[420px] mx-auto">
                  Has successfully finished learning plan{" "}
                  <strong className="text-background">
                    'AI Automation Specialist'
                  </strong>{" "}
                  with the highest possible mark and demonstrates mastery of
                  building, deploying, and monetizing AI agents.
                </p>

                {/* Ribbon Seal */}
                <div className="flex items-center justify-center mb-5">
                  <div className="relative">
                    {/* Ribbon tails */}
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-0">
                      <div className="w-4 h-6 bg-primary/80 -rotate-[15deg] rounded-b-sm origin-top" />
                      <div className="w-4 h-6 bg-primary/80 rotate-[15deg] rounded-b-sm origin-top" />
                    </div>
                    {/* Outer ring */}
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center shadow-lg relative z-10">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-dashed border-white/50 flex items-center justify-center">
                        <div className="flex flex-col items-center">
                          <span className="text-white text-[10px] md:text-xs font-bold leading-none">
                            ★
                          </span>
                          <span className="text-white font-bold text-sm md:text-base leading-none">
                            APPEX
                          </span>
                          <span className="text-white text-[8px] md:text-[10px] leading-none">
                            CERTIFIED
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Two signatures */}
                <div className="border-t border-[#E8E4DC] pt-4 grid grid-cols-3 items-end text-[10px] md:text-[11px] text-[#999] font-body">
                  <div className="text-left">
                    <p className="italic text-[14px] md:text-[16px] text-[#555] mb-0.5" style={{ fontFamily: "'Georgia', serif" }}>
                      J. Smith
                    </p>
                    <p className="font-medium">Course Instructor</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px]">7 March 2026</p>
                    <p className="text-[10px]">ID: 342428523</p>
                  </div>
                  <div className="text-right">
                    <p className="italic text-[14px] md:text-[16px] text-[#555] mb-0.5" style={{ fontFamily: "'Georgia', serif" }}>
                      A. Founder
                    </p>
                    <p className="font-medium">Founder, Appex</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex-1">
          <p className="text-primary uppercase text-[11px] tracking-[0.15em] font-semibold mb-3 font-body">
            FROM TRAINING TO CERTIFICATION
          </p>
          <h2 className="text-foreground text-[26px] md:text-[32px] font-extrabold leading-tight mb-3 md:mb-4 tracking-tight">
            From Training to Trusted Certification
          </h2>
          <p className="text-muted-foreground text-[14px] md:text-[15px] leading-relaxed mb-5 md:mb-6 font-body">
            Complete a structured program and earn a credential that verifies
            your ability to build, deploy, and sell real AI agents.
          </p>

          {/* 2-column skill grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mb-6 md:mb-8">
            {skills.map((row, i) =>
              row.map(
                (skill, j) =>
                  skill && (
                    <div
                      key={`${i}-${j}`}
                      className="flex items-center gap-2 text-[14px] md:text-[15px] text-muted-foreground font-body"
                    >
                      <span className="text-primary">→</span> {skill}
                    </div>
                  )
              )
            )}
          </div>

          <a
            href="/quiz"
            className="w-full sm:w-auto text-center inline-flex justify-center bg-gradient-primary text-white rounded-full px-6 py-3 text-sm font-semibold hover:opacity-90 transition-opacity font-body"
          >
            Get certified →
          </a>
        </div>
      </div>
    </section>
  );
}

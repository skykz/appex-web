const skills = [
  {
    title: "Verifiable and shareable",
    desc: "publish to your LinkedIn, CV, and portfolio with a unique credential ID anyone can verify.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M12 2a10 10 0 100 20 10 10 0 000-20z" />
      </svg>
    ),
  },
  {
    title: "Recognized by employers",
    desc: "a clear signal to hiring teams and clients that you have applied, job-ready Claude expertise.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7H4a2 2 0 00-2 2v9a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" />
      </svg>
    ),
  },
  {
    title: "Project-based assessment",
    desc: "awarded after completing real, hands-on projects — not multiple-choice quizzes or attendance.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
];

export default function Certificate() {
  return (
    <section className="bg-background py-16 md:py-24 px-4 md:px-10">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left — certificate mockup */}
        <div className="relative overflow-hidden">
          {/* Soft ambient glow */}
          <div className="absolute -inset-6 bg-gradient-to-br from-primary/15 via-transparent to-primary/5 rounded-3xl blur-2xl" />

          <div
            className="relative rounded-2xl p-4 md:p-7"
            style={{
              background: "#fff",
              border: "2px solid hsl(var(--primary))",
              boxShadow: "0 30px 60px -25px rgba(255,107,0,0.35)",
            }}
          >
            {/* Bookmark ribbon */}
            <div className="absolute top-0 right-5 md:right-10 w-10 md:w-16">
              <div
                className="w-full h-16 md:h-24"
                style={{
                  background: "hsl(var(--primary))",
                  clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%)",
                }}
              />
            </div>

            {/* Official seal / stamp */}
            <div className="absolute top-[38%] right-4 md:right-8 w-14 h-14 md:w-20 md:h-20 -rotate-12 pointer-events-none select-none">
              <svg viewBox="0 0 100 100" className="w-full h-full text-primary/70">
                <defs>
                  <path id="cert-seal-top" d="M 50 50 m -34 0 a 34 34 0 1 1 68 0" fill="none" />
                  <path id="cert-seal-bottom" d="M 50 50 m -34 0 a 34 34 0 1 0 68 0" fill="none" />
                </defs>
                <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="3" />
                <text fontSize="8.5" fontWeight="700" letterSpacing="2.5" fill="currentColor" style={{ fontFamily: "'Georgia', serif" }}>
                  <textPath href="#cert-seal-top" startOffset="50%" textAnchor="middle">
                    APPEX ACADEMY
                  </textPath>
                </text>
                <text fontSize="7" fontWeight="600" letterSpacing="3" fill="currentColor" style={{ fontFamily: "'Georgia', serif" }}>
                  <textPath href="#cert-seal-bottom" startOffset="50%" textAnchor="middle">
                    CERTIFIED
                  </textPath>
                </text>
                <text x="50" y="46" fontSize="20" fontWeight="800" fill="currentColor" textAnchor="middle" style={{ fontFamily: "'Georgia', serif" }}>
                  A
                </text>
                <text x="50" y="60" fontSize="6.5" fontWeight="600" letterSpacing="1" fill="currentColor" textAnchor="middle" style={{ fontFamily: "'Georgia', serif" }}>
                  2026
                </text>
              </svg>
            </div>

            <p className="text-[10px] md:text-[13px] text-[#666] mb-2 md:mb-3 font-body">
              Certificate of completion
            </p>

            <h3
              className="font-extrabold tracking-tight text-[#0A0A0A] leading-[0.95] mb-5 md:mb-14"
              style={{ fontSize: "clamp(22px, 4.5vw, 48px)" }}
            >
              MASTER THE <span className="hidden sm:inline"><br /></span>CLAUDE
            </h3>

            <div className="mb-2">
              <p className="text-[#0A0A0A] font-bold text-sm md:text-lg tracking-wide">
                JAMES SMITH
              </p>
              <div className="border-b border-[#111] mt-1" />
            </div>

            <p className="text-[#555] text-[10px] md:text-[13px] leading-relaxed font-body mb-5 md:mb-10 max-w-md">
              Achieved the highest distinction in the course, building expertise in prompting, automation, and end-to-end Claude workflows that real teams want to hire for.
            </p>

            <div className="flex items-end justify-between gap-2 md:gap-4">
              <div className="text-[9px] md:text-[11px] text-[#666] font-body leading-tight">
                <p>7 March 2026</p>
                <p>ID: 342428523</p>
              </div>

              <div className="flex items-center gap-1.5 md:gap-2">
                <div className="w-5 h-5 md:w-6 md:h-6 rounded-md bg-primary flex items-center justify-center text-white text-[10px] md:text-[11px] font-bold">
                  A
                </div>
                <span className="text-[#0A0A0A] font-bold text-xs md:text-sm tracking-tight">Appex</span>
              </div>

              <div className="grid grid-cols-2 gap-2 md:gap-4 text-center">
                <div>
                  <p className="italic text-[10px] md:text-[14px] text-[#333] leading-none mb-1" style={{ fontFamily: "'Georgia', serif" }}>
                    J. Smith
                  </p>
                  <p className="text-[8px] md:text-[10px] text-[#888] font-body">Course instructor</p>
                </div>
                <div>
                  <p className="italic text-[10px] md:text-[14px] text-[#333] leading-none mb-1" style={{ fontFamily: "'Georgia', serif" }}>
                    A. Founder
                  </p>
                  <p className="text-[8px] md:text-[10px] text-[#888] font-body">Founder, Appex</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — copy */}
        <div>
          <div className="inline-block mb-5 rounded-full px-4 py-1.5 text-[11px] font-bold tracking-[0.15em] uppercase text-primary" style={{ background: "rgba(255,107,0,0.12)", border: "1px solid rgba(255,107,0,0.25)" }}>
            Certification
          </div>

          <h2
            className="text-foreground font-extrabold leading-[1.05] tracking-tight mb-5"
            style={{ fontSize: "clamp(28px, 4.2vw, 48px)" }}
          >
            Certification that <br className="hidden md:block" />
            <span className="text-primary">carries weight</span>
          </h2>

          <p className="text-muted-foreground text-[15px] md:text-[16px] leading-relaxed mb-8 md:mb-10 font-body max-w-lg">
            Complete the program and earn the Appex AI Certificate — a verified credential built to demonstrate genuine, job-ready Claude expertise to employers and clients.
          </p>

          <div className="flex flex-col gap-5 md:gap-6 mb-8 md:mb-10">
            {skills.map((s) => (
              <div key={s.title} className="flex gap-4 items-start">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-primary"
                  style={{ background: "rgba(255,107,0,0.12)", border: "1px solid rgba(255,107,0,0.25)" }}
                >
                  {s.icon}
                </div>
                <p className="text-muted-foreground text-[14px] md:text-[15px] leading-[1.55] font-body">
                  <span className="text-foreground font-bold">{s.title}</span> — {s.desc}
                </p>
              </div>
            ))}
          </div>

          <a
            href="/quiz"
            data-cta="certificate"
            className="inline-flex justify-center bg-gradient-primary text-white rounded-xl px-7 py-3.5 text-base font-semibold hover:opacity-90 hover:-translate-y-px transition-all"
          >
            Start Free Quiz →
          </a>
        </div>
      </div>
    </section>
  );
}

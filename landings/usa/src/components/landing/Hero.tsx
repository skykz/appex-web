type Step = {
  title: string;
  meta: string;
  state: "done" | "working" | "queued";
};

const steps: Step[] = [
  { title: "Reads incoming client brief", meta: "Done · Gmail", state: "done" },
  { title: "Drafts a tailored proposal", meta: "Done · Claude", state: "done" },
  { title: "Suggests three meeting slots", meta: "Working… · Calendar", state: "working" },
  { title: "Sends invoice to your CRM", meta: "Queued · Notion", state: "queued" },
];

function ClaudeAgentMock() {
  return (
    <div className="relative opacity-0 animate-[fade-up_0.8s_ease-out_0.2s_forwards]">
      <div
        className="absolute -top-4 right-2 z-10 rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-foreground"
        style={{ background: "#1A1A1A", border: "1px solid rgba(249,115,22,0.3)" }}
      >
        Runs on autopilot
      </div>

      <div
        className="rounded-2xl p-6"
        style={{
          background: "#131313",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 30px 60px -20px rgba(249,115,22,0.25)",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#2a2a2a" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#2a2a2a" }} />
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#2a2a2a" }} />
            <span className="ml-2 text-[13px] font-semibold text-foreground">Claude Agent</span>
          </div>
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "#888" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Running
          </div>
        </div>

        <div
          className="rounded-xl p-4 mb-5 flex items-start gap-3"
          style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)" }}
          >
            <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-[11px] tracking-[0.18em] uppercase font-bold text-primary mb-1">
              Agent task
            </p>
            <p className="text-[15px] font-bold text-foreground leading-tight">
              Turn a fresh inquiry into a signed client
            </p>
          </div>
        </div>

        <div className="flex flex-col">
          {steps.map((step, i) => {
            const isWorking = step.state === "working";
            const isDone = step.state === "done";
            return (
              <div key={step.title} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isWorking ? "ring-4 ring-primary/15" : ""
                    }`}
                    style={{
                      background: isDone || isWorking ? "#F97316" : "#1A1A1A",
                      border: isDone || isWorking ? "none" : "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    {isDone && (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#0D0D0D" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {isWorking && (
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9" stroke="#0D0D0D" strokeWidth="3" strokeDasharray="14 40" strokeLinecap="round" />
                      </svg>
                    )}
                    {step.state === "queued" && (
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#555" }} />
                    )}
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className="w-px flex-1 my-1"
                      style={{ background: isDone ? "#F97316" : "rgba(255,255,255,0.08)" }}
                    />
                  )}
                </div>

                <div
                  className={`flex-1 pb-4 ${isWorking ? "rounded-lg px-3 py-2 -mt-1 mb-3" : ""}`}
                  style={
                    isWorking
                      ? { background: "#0f0f0f", border: "1px solid rgba(249,115,22,0.35)" }
                      : undefined
                  }
                >
                  <p
                    className={`text-[14px] font-semibold ${isDone || isWorking ? "text-foreground" : ""}`}
                    style={!isDone && !isWorking ? { color: "#666" } : undefined}
                  >
                    {step.title}
                  </p>
                  <p className="text-[12px] mt-0.5 font-body">
                    <span
                      className={isWorking ? "text-primary font-semibold" : ""}
                      style={!isWorking ? { color: "#777" } : undefined}
                    >
                      {step.meta}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="absolute -bottom-4 left-2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold text-foreground"
        style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        No coding needed
      </div>
    </div>
  );
}

export default function Hero() {

  return (
    <section className="bg-background min-h-[85vh] md:min-h-[90vh] pt-[80px] md:pt-[140px] pb-12 md:pb-20 px-4 md:px-10">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start gap-8 lg:gap-20">
        {/* Left */}
        <div className="flex-1 max-w-xl">
          <div className="inline-block mb-4 md:mb-5 rounded-full px-4 py-1.5 text-[11px] md:text-[12px] font-bold tracking-[0.15em] uppercase text-primary" style={{ background: "rgba(249,115,22,0.12)", border: "1px solid rgba(249,115,22,0.25)" }}>
            Claude AI Mastery
          </div>
          <h1
            className="text-foreground font-extrabold leading-[1.05] mb-4 md:mb-6 tracking-tight"
            style={{ fontSize: "clamp(36px, 5vw, 72px)" }}
          >
            Become a{" "}
            <span className="text-primary">Certified Claude Expert</span>
          </h1>
          <p className="text-muted-foreground text-[15px] md:text-[17px] leading-relaxed mb-6 md:mb-8 font-body max-w-lg">
            Appex gives you a personalized plan to master Claude — Anthropic's AI assistant — and build the future-ready skills every role now demands. No coding required.
          </p>


          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-5 mb-6 md:mb-8">
            <a
              href="/quiz"
              className="w-full sm:w-auto text-center inline-flex justify-center bg-gradient-primary text-white rounded-xl px-7 py-3.5 text-base font-semibold hover:opacity-90 hover:-translate-y-px transition-all"
            >
              Get your free plan →
            </a>

            {/* Social proof */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[
                  { letter: "A", bg: "#F97316" },
                  { letter: "M", bg: "#FFB800" },
                  { letter: "S", bg: "#F97316" },
                  { letter: "J", bg: "#FFB800" },
                ].map((a, i) => (
                  <span
                    key={i}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold text-background"
                    style={{ background: a.bg, border: "2px solid #0D0D0D" }}
                  >
                    {a.letter}
                  </span>
                ))}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-foreground text-[14px] font-bold">50,000+ learners</span>
                <div className="flex items-center gap-1 mt-0.5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <svg key={i} className="w-3 h-3 text-primary" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.366 2.446a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.365-2.446a1 1 0 00-1.176 0l-3.366 2.446c-.784.57-1.838-.196-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.075 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                    </svg>
                  ))}
                  <span className="text-muted-foreground text-[11px] ml-1">4.5/5 rating</span>
                </div>
              </div>
            </div>
          </div>

          {/* Trust row */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-6">
            {["No coding required", "First workflow in 15 min"].map((t) => (
              <span key={t} className="flex items-center gap-2 text-[12px] md:text-[13px] text-muted-foreground">
                <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Right — Claude agent workflow mockup */}
        <div className="w-full lg:flex-1 relative mt-8 lg:mt-0">
          <ClaudeAgentMock />
        </div>
      </div>
    </section>
  );
}

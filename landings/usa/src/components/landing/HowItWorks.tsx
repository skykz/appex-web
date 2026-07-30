import { ClipboardList, Route, Hammer, Wallet } from "lucide-react";

const steps = [
  {
    num: "1",
    Icon: ClipboardList,
    title: "Take the 60-second quiz",
    desc: "Tell us your job and goal. We build a learning path made for you — no guesswork.",
    tag: "Your custom plan",
  },
  {
    num: "2",
    Icon: Route,
    title: "Learn 10 min a day",
    desc: "Short, focused lessons you finish over coffee. No fluff, no long videos.",
    tag: "Fits any schedule",
  },
  {
    num: "3",
    Icon: Hammer,
    title: "Build real projects",
    desc: "Apply Claude to actual work from day one — and walk away with things you can show.",
    tag: "Portfolio that proves it",
  },
  {
    num: "4",
    Icon: Wallet,
    title: "Get certified & earn",
    desc: "Finish with a verified certificate and the skills clients and employers pay for.",
    tag: "Job-ready proof",
  },
];

/**
 * Connected journey — numbered nodes sit on a single progress line so the
 * eye reads it as one path (step 1 → 4). Each node pairs a concrete outcome
 * with a "what you get" tag, and the path ends in the primary CTA.
 */
export default function HowItWorks() {
  return (
    <section className="bg-background py-16 md:py-24 px-4 md:px-10 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14 md:mb-20">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold tracking-[0.15em] uppercase mb-4">
            How it works
          </span>
          <h2 className="text-foreground font-extrabold tracking-tight leading-[1.05] mb-4" style={{ fontSize: "clamp(28px, 4vw, 48px)" }}>
            From zero to <span className="text-primary">paid AI skills</span>
          </h2>
          <p className="text-muted-foreground text-[14px] md:text-[16px] max-w-xl mx-auto leading-relaxed">
            Four simple steps. Most learners land their first real result within weeks — not "someday."
          </p>
        </div>

        {/* Journey */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div
            className="hidden lg:block absolute left-0 right-0 top-[28px] h-[2px]"
            style={{
              background: "linear-gradient(90deg, transparent 0%, #FED7AA 12%, #FED7AA 88%, transparent 100%)",
            }}
            aria-hidden
          />

          <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6 relative">
            {steps.map((s, i) => (
              <li key={s.num} className="relative flex flex-col items-center text-center lg:items-start lg:text-left">
                {/* Numbered node */}
                <div className="relative z-10 flex items-center gap-3 lg:block">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-[22px] shadow-[0_8px_20px_-6px_rgba(249,115,22,0.5)]"
                    style={{ background: "linear-gradient(135deg, #F97316 0%, #FB923C 100%)" }}
                  >
                    {s.num}
                  </div>
                  {/* Icon chip */}
                  <div className="lg:mt-4 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <s.Icon className="w-[18px] h-[18px] text-primary" strokeWidth={2.25} />
                  </div>
                </div>

                {/* Content */}
                <div className="mt-4 lg:mt-5">
                  <h3 className="text-foreground font-bold text-[16px] md:text-[17px] tracking-tight mb-1.5 leading-tight">
                    {s.title}
                  </h3>
                  <p className="text-muted-foreground text-[13.5px] md:text-[14px] leading-[1.55] font-body max-w-[260px] mx-auto lg:mx-0">
                    {s.desc}
                  </p>
                  <span className="inline-flex items-center gap-1.5 mt-3 text-primary text-[12px] font-bold tracking-tight">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {s.tag}
                  </span>
                </div>
              </li>
            ))}
          </ol>

          {/* CTA — the payoff at the end of the path */}
          <div className="text-center mt-14 md:mt-16">
            <a
              href="/quiz"
              data-cta="how_it_works"
              className="inline-flex items-center gap-2 bg-gradient-primary text-white rounded-xl px-8 py-4 text-base font-semibold hover:opacity-90 hover:-translate-y-px transition-all shadow-[0_10px_30px_-10px_rgba(249,115,22,0.6)]"
            >
              Start step 1 — it's free
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </a>
            <p className="text-muted-foreground text-[12.5px] mt-3">
              Takes 60 seconds · No credit card needed
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

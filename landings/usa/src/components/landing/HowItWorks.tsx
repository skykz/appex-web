import { ClipboardList, Route, Hammer, Wallet } from "lucide-react";

const steps = [
  {
    num: 1,
    Icon: ClipboardList,
    title: "Take the free quiz",
    desc: "Answer a few questions about your goals, schedule, and experience. We build your personalized learning path.",
  },
  {
    num: 2,
    Icon: Route,
    title: "Follow your plan",
    desc: "Work through step-by-step lessons that take you from your first prompt to advanced Claude workflows.",
  },
  {
    num: 3,
    Icon: Hammer,
    title: "Build real projects",
    desc: "Apply every lesson to genuine, hands-on work you can show off and reuse.",
  },
  {
    num: 4,
    Icon: Wallet,
    title: "Stay ahead with your skills",
    desc: "Get certified, grow a portfolio, and stay relevant as AI reshapes your field.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-background py-20 md:py-28 px-4 md:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 md:mb-24">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wider uppercase mb-6">
            How it works
          </span>
          <h2 className="text-foreground font-extrabold tracking-tight leading-[1.05] mb-5" style={{ fontSize: "clamp(32px, 5vw, 56px)" }}>
            From your first quiz to future-ready skills
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            A guided path — each step builds on the last until Claude is a skill that keeps you ahead.
          </p>
        </div>

        {/* Timeline */}
        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-6">
          {steps.map((s, i) => (
            <div key={s.num} className="relative flex flex-col items-center text-center px-2">
              {/* connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-10 left-[calc(50%+3rem)] right-[calc(-50%+3rem)] h-px bg-gradient-to-r from-primary/40 to-primary/10" />
              )}

              {/* icon circle with badge */}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <s.Icon className="w-8 h-8 text-primary" strokeWidth={2} />
                </div>
                <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center shadow-lg shadow-primary/30">
                  {s.num}
                </div>
              </div>

              <h3 className="text-foreground font-bold text-lg md:text-xl mb-3">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-[260px]">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

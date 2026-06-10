import { ClipboardList, Route, Hammer, Wallet } from "lucide-react";

const steps = [
  {
    num: "01",
    Icon: ClipboardList,
    title: "Quick quiz",
    desc: "Tell us your goals — we build your path.",
  },
  {
    num: "02",
    Icon: Route,
    title: "Daily lessons",
    desc: "Short, focused, in your own time.",
  },
  {
    num: "03",
    Icon: Hammer,
    title: "Real projects",
    desc: "Apply what you learn from day one.",
  },
  {
    num: "04",
    Icon: Wallet,
    title: "Get certified",
    desc: "Earn proof you can put to work.",
  },
];

/**
 * "Playing card" style — vertical portrait cards with a huge number filling
 * the top half and content stacked below. Cards have a subtle tilt that
 * straightens on hover, like flicking through a deck.
 */
export default function HowItWorks() {
  return (
    <section className="bg-background py-16 md:py-24 px-4 md:px-10 overflow-hidden">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold tracking-[0.15em] uppercase mb-4">
            How it works
          </span>
          <h2 className="text-foreground font-extrabold tracking-tight leading-[1.05] mb-4" style={{ fontSize: "clamp(28px, 4vw, 48px)" }}>
            Your path from <span className="text-primary">beginner to expert</span>
          </h2>
          <p className="text-muted-foreground text-[14px] md:text-[16px] max-w-xl mx-auto leading-relaxed">
            Four clear steps. Each one builds on the last — until working with Claude feels second nature.
          </p>
        </div>

        {/* Compact playing-card deck */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 max-w-4xl mx-auto">
          {steps.map((s, i) => {
            const tilts = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];
            return (
              <div
                key={s.num}
                className={`group relative rounded-xl overflow-hidden bg-white transition-all duration-300 ${tilts[i]} hover:rotate-0 hover:-translate-y-1 hover:shadow-[0_20px_40px_-15px_rgba(249,115,22,0.4)]`}
                style={{
                  border: "1px solid hsl(var(--border))",
                  boxShadow: "0 6px 18px -8px rgba(0,0,0,0.08)",
                }}
              >
                {/* Top — orange gradient with number */}
                <div
                  className="relative h-[100px] md:h-[110px] flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, #F97316 0%, #FFB800 100%)",
                  }}
                >
                  {/* Massive number */}
                  <span
                    className="font-extrabold text-white leading-none tracking-tighter"
                    style={{
                      fontSize: "clamp(56px, 9vw, 80px)",
                      textShadow: "0 4px 16px rgba(0,0,0,0.12)",
                    }}
                  >
                    {s.num}
                  </span>

                  {/* STEP label */}
                  <div className="absolute top-2 left-2.5 text-white/90 text-[9px] font-bold tracking-widest">
                    STEP
                  </div>

                  {/* Icon badge in corner */}
                  <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white/95 flex items-center justify-center shadow-md">
                    <s.Icon className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                  </div>
                </div>

                {/* Bottom — title + short description */}
                <div className="p-3 md:p-4">
                  <h3 className="text-foreground font-bold text-[13px] md:text-[14.5px] tracking-tight mb-1">
                    {s.title}
                  </h3>
                  <p className="text-muted-foreground text-[11.5px] md:text-[12.5px] leading-[1.5]">
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

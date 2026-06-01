import { Code2, Wallet, PenLine, Search, Workflow, Lightbulb } from "lucide-react";

const bigCards = [
  {
    icon: Code2,
    title: "Building & Coding",
    desc: "Build websites, apps, and tools with Claude — no traditional coding required.",
    tags: ["Websites", "Web apps", "Games"],
    highlight: false,
  },
  {
    icon: Wallet,
    title: "Client Work & Income",
    desc: "Turn Claude into a future-proof skill set you can offer as real, paid services.",
    tags: ["Future-ready", "In-demand", "Stay relevant"],
    highlight: true,
  },
];

const smallCards = [
  {
    icon: PenLine,
    title: "Writing & Editing",
    desc: "Draft, rewrite, and polish content, emails, and copy that sound like you.",
  },
  {
    icon: Search,
    title: "Research & Analysis",
    desc: "Summarize documents, analyze data, and surface insights in minutes.",
  },
  {
    icon: Workflow,
    title: "Automation",
    desc: "Design Claude-powered workflows that handle your repetitive work.",
  },
  {
    icon: Lightbulb,
    title: "Strategy & Ideas",
    desc: "Use Claude as a thinking partner for plans, decisions, and problem-solving.",
  },
];

export default function Projects() {
  return (
    <section id="projects" className="bg-background py-16 md:py-24 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-block mb-5 rounded-full px-4 py-1.5 text-[11px] font-bold tracking-[0.15em] uppercase text-primary" style={{ background: "rgba(255,107,0,0.12)", border: "1px solid rgba(255,107,0,0.25)" }}>
            What you'll do with Claude
          </div>
          <h2
            className="text-foreground font-extrabold leading-[1.1] tracking-tight mb-4"
            style={{ fontSize: "clamp(28px, 4.2vw, 48px)" }}
          >
            One skill, dozens of <span className="text-primary">ways to use it</span>
          </h2>
          <p className="text-muted-foreground text-[15px] md:text-[16px] leading-relaxed font-body max-w-2xl mx-auto">
            Claude is a single tool — but mastering it unlocks dozens of future-ready ways to work faster, build more, and stay ahead.
          </p>
        </div>

        {/* Top row — 2 large */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 mb-5 md:mb-6">
          {bigCards.map((c) => {
            const Icon = c.icon;
            const highlight = c.highlight;
            return (
              <div
                key={c.title}
                className="rounded-2xl p-7 md:p-9 transition-transform hover:-translate-y-1"
                style={
                  highlight
                    ? {
                        background: "linear-gradient(135deg, #FF6B00, #FF8A2A)",
                        boxShadow: "0 25px 50px -20px rgba(255,107,0,0.55)",
                      }
                    : {
                        background: "#131313",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }
                }
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                  style={{
                    background: highlight ? "rgba(255,255,255,0.18)" : "rgba(255,107,0,0.12)",
                    border: highlight ? "1px solid rgba(255,255,255,0.25)" : "1px solid rgba(255,107,0,0.25)",
                  }}
                >
                  <Icon className={`w-5 h-5 ${highlight ? "text-white" : "text-primary"}`} />
                </div>
                <h3
                  className={`text-[22px] md:text-[26px] font-bold tracking-tight mb-2.5 ${
                    highlight ? "text-white" : "text-foreground"
                  }`}
                >
                  {c.title}
                </h3>
                <p
                  className={`text-[14.5px] md:text-[15.5px] leading-relaxed font-body mb-6 ${
                    highlight ? "text-white/85" : "text-muted-foreground"
                  }`}
                >
                  {c.desc}
                </p>
                <div className="flex flex-wrap gap-2">
                  {c.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[12px] font-semibold rounded-full px-3 py-1.5 font-body"
                      style={
                        highlight
                          ? {
                              background: "rgba(255,255,255,0.18)",
                              color: "#fff",
                              border: "1px solid rgba(255,255,255,0.25)",
                            }
                          : {
                              background: "rgba(255,107,0,0.12)",
                              color: "hsl(var(--primary))",
                              border: "1px solid rgba(255,107,0,0.25)",
                            }
                      }
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom row — 4 small */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 mb-10 md:mb-12">
          {smallCards.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                className="rounded-2xl p-6 transition-transform hover:-translate-y-1"
                style={{ background: "#131313", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: "rgba(255,107,0,0.12)", border: "1px solid rgba(255,107,0,0.25)" }}
                >
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-foreground font-bold text-[17px] md:text-[18px] tracking-tight mb-2">
                  {c.title}
                </h3>
                <p className="text-muted-foreground text-[13.5px] md:text-[14px] leading-[1.55] font-body">
                  {c.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href="/quiz"
            className="inline-flex justify-center bg-gradient-primary text-white rounded-full px-8 py-3.5 text-base font-semibold hover:opacity-90 hover:-translate-y-px transition-all"
          >
            Start mastering Claude →
          </a>
        </div>
      </div>
    </section>
  );
}

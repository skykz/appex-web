import { Code2, Wallet, PenLine, Search, Workflow, Lightbulb, ArrowUpRight } from "lucide-react";

/**
 * Compact 3-column uniform grid.
 * The "Client Work & Income" tile is highlighted in orange but sits in the
 * normal grid flow — no asymmetric spans, no oversized cards.
 */
const tiles = [
  {
    icon: PenLine,
    title: "Writing & Editing",
    desc: "Draft, refine, and polish content, emails, and copy that sound like you.",
  },
  {
    icon: Wallet,
    title: "Client Work & Income",
    desc: "Turn Claude expertise into a service businesses pay for — every month.",
    highlight: true,
  },
  {
    icon: Search,
    title: "Research & Analysis",
    desc: "Summarize reports, analyze data, and surface insights in minutes.",
  },
  {
    icon: Code2,
    title: "Building & Coding",
    desc: "Build websites, apps, and internal tools — no traditional coding required.",
  },
  {
    icon: Workflow,
    title: "Automation",
    desc: "Design Claude-powered workflows that handle the repetitive parts of your day.",
  },
  {
    icon: Lightbulb,
    title: "Strategy & Ideas",
    desc: "Use Claude as a thinking partner for plans, decisions, and problem-solving.",
  },
];

export default function Projects() {
  return (
    <section id="projects" className="bg-muted/30 py-14 md:py-20 px-4 md:px-10">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-block mb-4 rounded-full px-3.5 py-1.5 text-[11px] font-bold tracking-[0.15em] uppercase text-primary" style={{ background: "rgba(249,115,22,0.10)" }}>
            What you'll do with Claude
          </div>
          <h2
            className="text-foreground font-extrabold leading-[1.1] tracking-tight mb-3"
            style={{ fontSize: "clamp(26px, 3.6vw, 42px)" }}
          >
            One tool, <span className="text-primary">endless applications</span>
          </h2>
          <p className="text-muted-foreground text-[14px] md:text-[15px] leading-relaxed font-body max-w-xl mx-auto">
            Claude isn't a single trick — mastering it unlocks an entire toolkit of professional, future-ready ways to work.
          </p>
        </div>

        {/* Compact uniform grid: 3 columns × 2 rows, all tiles same size */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-8 md:mb-10">
          {tiles.map((tile) => {
            const Icon = tile.icon;
            const highlight = tile.highlight;
            return (
              <div
                key={tile.title}
                className="group relative rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_15px_35px_-15px_rgba(249,115,22,0.3)]"
                style={
                  highlight
                    ? {
                        background: "linear-gradient(135deg, #F97316, #FF8A2A)",
                        boxShadow: "0 15px 35px -15px rgba(249,115,22,0.5)",
                      }
                    : {
                        background: "white",
                        border: "1px solid hsl(var(--border))",
                      }
                }
              >
                {/* Icon + arrow */}
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{
                      background: highlight ? "rgba(255,255,255,0.22)" : "rgba(249,115,22,0.10)",
                    }}
                  >
                    <Icon className={`w-4 h-4 ${highlight ? "text-white" : "text-primary"}`} strokeWidth={2.2} />
                  </div>
                  <ArrowUpRight
                    className={`w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all ${highlight ? "text-white/85" : "text-primary"}`}
                  />
                </div>

                {/* Title */}
                <h3
                  className={`font-bold tracking-tight mb-1.5 text-[15px] md:text-[16px] ${
                    highlight ? "text-white" : "text-foreground"
                  }`}
                >
                  {tile.title}
                </h3>

                {/* Description */}
                <p
                  className={`leading-[1.5] font-body text-[12.5px] md:text-[13px] ${
                    highlight ? "text-white/85" : "text-muted-foreground"
                  }`}
                >
                  {tile.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href="/quiz"
            className="inline-flex justify-center bg-gradient-primary text-white rounded-full px-7 py-3 text-[14px] font-semibold hover:opacity-90 hover:-translate-y-px transition-all"
          >
            Start mastering Claude →
          </a>
        </div>
      </div>
    </section>
  );
}

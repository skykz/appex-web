import { Megaphone, Laptop, Store, Headphones, TrendingUp, Compass, ClipboardList, GraduationCap, ArrowRight } from "lucide-react";

const roles = [
  {
    slug: "marketers",
    label: "Marketers",
    icon: Megaphone,
    outcome: "Draft a month of campaigns, emails & ad copy before your coffee gets cold.",
    stat: "~8 hrs saved / week",
  },
  {
    slug: "freelancers",
    label: "Freelancers",
    icon: Laptop,
    outcome: "Win more clients — send polished proposals in minutes, not evenings.",
    stat: "2x proposals out",
  },
  {
    slug: "small-business-owners",
    label: "Small business owners",
    icon: Store,
    outcome: "Run marketing, ops & support like you hired a team you can't afford yet.",
    stat: "1 person, 5 roles",
  },
  {
    slug: "customer-support-teams",
    label: "Customer support teams",
    icon: Headphones,
    outcome: "Answer tickets faster with replies that sound human, never canned.",
    stat: "Reply 3x faster",
  },
  {
    slug: "sales-professionals",
    label: "Sales pros",
    icon: TrendingUp,
    outcome: "Personalize every outreach at scale and never stare at a blank follow-up.",
    stat: "More reps, more deals",
  },
  {
    slug: "career-changers",
    label: "Career changers",
    icon: Compass,
    outcome: "Learn the exact AI skills employers pay for — and prove them fast.",
    stat: "Job-ready in weeks",
  },
  {
    slug: "virtual-assistants",
    label: "Virtual assistants",
    icon: ClipboardList,
    outcome: "Take on more clients without the burnout by letting Claude do the busywork.",
    stat: "Handle 2x the load",
  },
  {
    slug: "students",
    label: "Students",
    icon: GraduationCap,
    outcome: "Study smarter, write sharper, and graduate already fluent in AI.",
    stat: "Ahead of the class",
  },
];

export default function WhoItsFor() {
  return (
    <section className="bg-muted/30 py-16 md:py-24 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-block mb-5 rounded-full px-4 py-1.5 text-[11px] font-bold tracking-[0.15em] uppercase text-primary" style={{ background: "rgba(249,115,22,0.10)" }}>
            Made for your role
          </div>
          <h2
            className="text-foreground font-extrabold leading-[1.1] tracking-tight mb-4"
            style={{ fontSize: "clamp(28px, 4.2vw, 48px)" }}
          >
            Whatever you do all day, <br className="hidden md:block" />
            <span className="text-primary">Claude does it with you</span>
          </h2>
          <p className="text-muted-foreground text-[15px] md:text-[16px] leading-relaxed font-body max-w-2xl mx-auto">
            Find your role below. Every Appex path is tuned to how you actually work — and shows you exactly where AI hands your time back.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {roles.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.slug}
                className="group relative flex flex-col rounded-2xl p-5 bg-white border border-border transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_12px_30px_-12px_rgba(249,115,22,0.35)] cursor-default"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-white"
                    style={{ background: "rgba(249,115,22,0.10)" }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="flex-1 text-foreground font-bold text-[15px] md:text-[16px] tracking-tight leading-tight">
                    {r.label}
                  </span>
                </div>

                <p className="text-muted-foreground text-[13.5px] leading-relaxed font-body mb-4 flex-1">
                  {r.outcome}
                </p>

                <div className="flex items-center justify-between pt-3 border-t border-border/70">
                  <span className="text-primary font-bold text-[12px] tracking-tight">
                    {r.stat}
                  </span>
                  <ArrowRight className="w-4 h-4 text-primary opacity-0 -translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

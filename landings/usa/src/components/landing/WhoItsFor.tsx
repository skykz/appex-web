import { Link } from "react-router-dom";
import { Megaphone, Laptop, Store, Headphones, TrendingUp, Compass, ClipboardList, GraduationCap, ArrowRight } from "lucide-react";

const roles = [
  { slug: "marketers", label: "Marketers", icon: Megaphone },
  { slug: "freelancers", label: "Freelancers", icon: Laptop },
  { slug: "small-business-owners", label: "Small business owners", icon: Store },
  { slug: "customer-support-teams", label: "Customer support teams", icon: Headphones },
  { slug: "sales-professionals", label: "Sales professionals", icon: TrendingUp },
  { slug: "career-changers", label: "Career changers", icon: Compass },
  { slug: "virtual-assistants", label: "Virtual assistants", icon: ClipboardList },
  { slug: "students", label: "Students", icon: GraduationCap },
];

export default function WhoItsFor() {
  return (
    <section className="bg-background py-16 md:py-24 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10 md:mb-14">
          <div className="inline-block mb-5 rounded-full px-4 py-1.5 text-[11px] font-bold tracking-[0.15em] uppercase text-primary" style={{ background: "rgba(255,107,0,0.12)", border: "1px solid rgba(255,107,0,0.25)" }}>
            Who it's for
          </div>
          <h2
            className="text-foreground font-extrabold leading-[1.1] tracking-tight mb-4"
            style={{ fontSize: "clamp(28px, 4.2vw, 48px)" }}
          >
            Built for people who want <br className="hidden md:block" />
            an <span className="text-primary">edge with Claude</span>
          </h2>
          <p className="text-muted-foreground text-[15px] md:text-[16px] leading-relaxed font-body max-w-2xl mx-auto">
            Whatever your role or starting point, there's an Appex path that turns Claude into a real advantage for you.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {roles.map((r) => {
            const Icon = r.icon;
            return (
              <Link
                key={r.slug}
                to={`/ai-skills-for/${r.slug}`}
                className="flex items-center gap-4 rounded-2xl p-5 no-underline"
                style={{ background: "#131313", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-primary"
                  style={{ background: "rgba(255,107,0,0.12)", border: "1px solid rgba(255,107,0,0.25)" }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span className="flex-1 text-foreground font-bold text-[15px] md:text-[16px] tracking-tight">
                  {r.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { Clock, Zap, Star } from "lucide-react";
import avatar1 from "@/assets/avatar-1.jpg";
import avatar2 from "@/assets/avatar-2.jpg";
import avatar3 from "@/assets/avatar-3.jpg";
import avatar4 from "@/assets/avatar-4.jpg";

const stats = [
  {
    number: "30–60",
    unit: "days",
    Icon: Clock,
    title: "From zero to your first AI income",
    text: "Most learners land their first paid AI project within 30–60 days of starting Appex.",
    note: "Based on learner outcomes",
  },
  {
    number: "92%",
    unit: "",
    Icon: Zap,
    title: "Built their first AI workflow",
    text: "Most learners ship a working Claude workflow within their very first sessions.",
    note: "First-week completion rate",
  },
  {
    number: "4.8",
    unit: "/ 5",
    Icon: Star,
    title: "Average student rating",
    text: "Loved for practical, no-fluff lessons that genuinely change how people work.",
    note: "Across 2,100+ reviews",
    isRating: true,
    ratingValue: 4.8,
  },
];

export default function Stats() {
  return (
    <section className="bg-background py-16 md:py-24 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-center font-extrabold tracking-tight text-foreground text-[36px] sm:text-[56px] md:text-[76px] leading-[1.05] mb-6 md:mb-8">
          <span className="inline-flex items-center flex-wrap justify-center gap-x-3 md:gap-x-5 gap-y-2">
            <span>Global</span>
            <img
              src={avatar1}
              alt="Appex student"
              loading="lazy"
              width={512}
              height={512}
              className="inline-block w-[0.9em] h-[0.9em] rounded-full object-cover ring-2 ring-background"
            />
            <span>learners</span>
          </span>
          <br />
          <span className="inline-flex items-center flex-wrap justify-center gap-x-3 md:gap-x-5 gap-y-2">
            <img
              src={avatar2}
              alt="Appex student"
              loading="lazy"
              width={512}
              height={512}
              className="inline-block w-[0.9em] h-[0.9em] rounded-full object-cover ring-2 ring-background"
            />
            <span>mastering</span>
          </span>
          <br />
          <span className="inline-flex items-center flex-wrap justify-center gap-x-3 md:gap-x-5 gap-y-2">
            <img
              src={avatar3}
              alt="Appex student"
              loading="lazy"
              width={512}
              height={512}
              className="inline-block w-[0.9em] h-[0.9em] rounded-full object-cover ring-2 ring-background"
            />
            <span className="text-primary">Claude</span>
            <img
              src={avatar4}
              alt="Appex student"
              loading="lazy"
              width={512}
              height={512}
              className="inline-block w-[0.9em] h-[0.9em] rounded-full object-cover ring-2 ring-background"
            />
          </span>
        </h2>

        {/* Social-proof strip — reinforces "global learners" before the numbers */}
        <div className="flex items-center justify-center gap-3 mb-12 md:mb-16">
          <div className="flex -space-x-3">
            {[avatar1, avatar2, avatar3, avatar4].map((a, i) => (
              <img
                key={i}
                src={a}
                alt="Appex learner"
                loading="lazy"
                width={512}
                height={512}
                className="w-9 h-9 md:w-10 md:h-10 rounded-full object-cover ring-2 ring-background"
              />
            ))}
          </div>
          <p className="text-muted-foreground text-[13px] md:text-[15px] font-body">
            Join <span className="text-foreground font-semibold">thousands of learners</span> already building with AI
          </p>
        </div>

        {/* Stat cards — compact horizontal layout: icon + big number on the left,
            supporting copy on the right. Shorter and faster to scan than tall blocks. */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-stretch">
          {stats.map((s, i) => {
            const Icon = s.Icon;
            return (
              <div
                key={i}
                className={`group relative rounded-2xl p-5 md:p-6 bg-white border transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(249,115,22,0.4)] flex items-start gap-4 ${
                  s.isRating ? "border-primary/40 shadow-[0_10px_30px_-16px_rgba(249,115,22,0.35)]" : "border-border"
                }`}
              >
                {/* Left: icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-primary flex-shrink-0 transition-colors duration-200 group-hover:bg-primary group-hover:text-white"
                  style={{ background: "rgba(249,115,22,0.10)" }}
                >
                  <Icon className="w-[22px] h-[22px]" strokeWidth={2.25} />
                </div>

                {/* Right: number + copy */}
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-foreground leading-none flex items-baseline gap-1.5">
                    <span className="text-[34px] md:text-[40px] tracking-tight">{s.number}</span>
                    {s.unit && <span className="text-[16px] md:text-[18px] text-primary font-bold">{s.unit}</span>}
                  </p>

                  {/* Stars under the rating number */}
                  {s.isRating && (
                    <div className="flex items-center gap-0.5 mt-1.5" aria-label={`${s.ratingValue} out of 5`}>
                      {[0, 1, 2, 3, 4].map((n) => {
                        const fill = Math.max(0, Math.min(1, (s.ratingValue ?? 0) - n));
                        return (
                          <span key={n} className="relative inline-block w-3.5 h-3.5">
                            <Star className="absolute inset-0 w-3.5 h-3.5 text-primary/25" fill="currentColor" strokeWidth={0} />
                            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                              <Star className="w-3.5 h-3.5 text-primary" fill="currentColor" strokeWidth={0} />
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <p className="text-[14.5px] md:text-[15px] font-bold text-foreground mt-2 tracking-tight leading-snug">
                    {s.title}
                  </p>
                  <p className="text-[12.5px] md:text-[13px] text-muted-foreground leading-relaxed font-body mt-1">
                    {s.text}
                  </p>
                  <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-wide text-primary/80">
                    {s.note}
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

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

        {/* Stat cards — clean white surfaces with a colored accent, one anchored by the rating */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 items-stretch">
          {stats.map((s, i) => {
            const Icon = s.Icon;
            return (
              <div
                key={i}
                className={`group relative rounded-2xl p-6 md:p-8 bg-white border transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_16px_40px_-16px_rgba(249,115,22,0.4)] flex flex-col ${
                  s.isRating ? "border-primary/40 shadow-[0_10px_30px_-16px_rgba(249,115,22,0.35)]" : "border-border"
                }`}
              >
                {/* Icon + optional "top result" ribbon */}
                <div className="flex items-center justify-between mb-5">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-primary transition-colors duration-200 group-hover:bg-primary group-hover:text-white"
                    style={{ background: "rgba(249,115,22,0.10)" }}
                  >
                    <Icon className="w-[22px] h-[22px]" strokeWidth={2.25} />
                  </div>
                  {s.isRating && (
                    <div className="flex items-center gap-0.5" aria-label={`${s.ratingValue} out of 5`}>
                      {[0, 1, 2, 3, 4].map((n) => {
                        const fill = Math.max(0, Math.min(1, (s.ratingValue ?? 0) - n));
                        return (
                          <span key={n} className="relative inline-block w-4 h-4">
                            <Star className="absolute inset-0 w-4 h-4 text-primary/25" fill="currentColor" strokeWidth={0} />
                            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                              <Star className="w-4 h-4 text-primary" fill="currentColor" strokeWidth={0} />
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Number */}
                <p className="font-extrabold text-foreground leading-none mb-4 flex items-baseline gap-1.5">
                  <span className="text-[42px] md:text-[56px] tracking-tight">{s.number}</span>
                  {s.unit && <span className="text-[18px] md:text-[22px] text-primary font-bold">{s.unit}</span>}
                </p>

                {/* Title */}
                <p className="text-[16px] md:text-[17px] font-bold text-foreground mb-2 tracking-tight leading-snug">
                  {s.title}
                </p>

                {/* Description */}
                <p className="text-[13.5px] md:text-[14px] text-muted-foreground leading-relaxed font-body flex-1">
                  {s.text}
                </p>

                {/* Credibility note */}
                <p className="mt-5 pt-4 border-t border-border/70 text-[11.5px] font-semibold uppercase tracking-wide text-primary">
                  {s.note}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

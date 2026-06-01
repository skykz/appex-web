import avatar1 from "@/assets/avatar-1.jpg";
import avatar2 from "@/assets/avatar-2.jpg";
import avatar3 from "@/assets/avatar-3.jpg";
import avatar4 from "@/assets/avatar-4.jpg";

const stats = [
  {
    number: "100K+",
    title: "Learners building AI skills",
    text: "A growing community using Claude to take on real, future-ready work every day.",
  },
  {
    number: "92%",
    title: "Built their first AI workflow",
    text: "Most learners ship a working Claude workflow within their first sessions on Appex.",
  },
  {
    number: "4.5/5",
    title: "Average student rating",
    text: "Learners consistently rate Appex among the best places to learn Claude in practice.",
  },
];

export default function Stats() {
  return (
    <section className="bg-background py-16 md:py-24 px-4 md:px-10">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-center font-extrabold tracking-tight text-foreground text-[36px] sm:text-[56px] md:text-[76px] leading-[1.05] mb-12 md:mb-20">
          <span className="inline-flex items-center flex-wrap justify-center gap-x-3 md:gap-x-5 gap-y-2">
            <span>100,000+</span>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {stats.map((s, i) => (
            <div
              key={i}
              className="rounded-3xl p-7 md:p-9 bg-gradient-to-br from-[hsl(20_100%_55%)] to-[hsl(35_100%_55%)] shadow-[0_20px_60px_-20px_hsl(20_100%_50%/0.45)]"
            >
              <p className="font-extrabold text-white text-[44px] md:text-[60px] leading-none mb-8 md:mb-10">
                {s.number}
              </p>
              <p className="text-[16px] md:text-[18px] font-bold text-white mb-3">
                {s.title}
              </p>
              <p className="text-[14px] md:text-[15px] text-white/90 leading-relaxed">
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

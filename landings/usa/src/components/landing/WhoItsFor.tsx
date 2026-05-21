import persona1 from "@/assets/persona-1.jpg";
import persona2 from "@/assets/persona-2.jpg";
import persona3 from "@/assets/persona-3.jpg";
import persona4 from "@/assets/persona-4.jpg";
import persona5 from "@/assets/persona-5.jpg";

const personas = [
  {
    tag: "Stay-at-home mom",
    quote: "I work during nap time. Made $600 in month one.",
    desc: "Built 2 booking bots for local salons while the kids slept. Now earns recurring income.",
    outcome: "→ $500–1,500/month",
    img: persona1,
  },
  {
    tag: "Career switcher",
    quote: "Quit my HR job. Now I build AI agents for companies.",
    desc: "Went from zero tech skills to landing her first freelance client in 6 weeks.",
    outcome: "→ $1,000–3,000/month",
    img: persona2,
  },
  {
    tag: "Returning to work",
    quote: "3 years out. AI gave me a fresh start.",
    desc: "After a career break, Appex provided a clear path back into the job market with modern skills.",
    outcome: "→ $500–1,500/month",
    img: persona3,
  },
  {
    tag: "Side-hustle seeker",
    quote: "Keep your job. Add $500–$2,000/month on the side.",
    desc: "Works evenings and weekends building automations for small businesses in his city.",
    outcome: "→ $500–2,000/month",
    img: persona4,
  },
  {
    tag: "Recent graduate",
    quote: "Landed my first client before finishing the course.",
    desc: "No experience needed. The program gave me real skills and a portfolio to show.",
    outcome: "→ $800–2,000/month",
    img: persona5,
  },
];

const doubled = [...personas, ...personas];

export default function WhoItsFor() {
  return (
    <section className="bg-background py-16 md:py-24 overflow-hidden">
      <div className="max-w-5xl mx-auto px-4 md:px-10 mb-8 md:mb-12">
        <p className="text-primary uppercase text-[11px] tracking-[0.15em] font-semibold mb-3 font-body">
          WHO IT'S FOR
        </p>
        <h2 className="text-foreground text-[28px] md:text-[38px] font-extrabold leading-tight mb-2 tracking-tight">
          It works if you're one of these
        </h2>
        <p className="text-muted-foreground text-[14px] md:text-[15px] font-body">
          Real people. No tech background needed.
        </p>
      </div>

      {/* Auto-scrolling carousel */}
      <div className="group">
        <div className="flex gap-4 md:gap-5 animate-marquee-slow group-hover:[animation-play-state:paused] pl-4 md:pl-5">
          {doubled.map((p, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[260px] md:w-[320px] bg-card border border-border rounded-[14px] overflow-hidden"
            >
              <img
                src={p.img}
                alt={p.tag}
                className="w-full aspect-[16/10] object-cover"
                loading="lazy"
                width={640}
                height={400}
              />
              <div className="p-4 md:p-6">
                <p className="text-primary uppercase text-[11px] tracking-wider font-semibold mb-2 font-body">
                  {p.tag}
                </p>
                <p className="font-bold text-[15px] md:text-[17px] text-foreground mb-2">
                  "{p.quote}"
                </p>
                <p className="text-[12px] md:text-[13px] text-muted-foreground leading-relaxed mb-3 md:mb-4 font-body">
                  {p.desc}
                </p>
                <span className="inline-block bg-accent text-accent-foreground text-xs rounded-full px-3 py-1 font-medium font-body">
                  {p.outcome}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

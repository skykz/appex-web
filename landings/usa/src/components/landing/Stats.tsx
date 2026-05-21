const stats = [
  {
    number: "100+",
    highlight: true,
    text: "paying students from cohorts before launch — real demand, not projections",
  },
  {
    number: "$0",
    highlight: false,
    text: "coding experience needed. If you can use Gmail, you can build an AI agent",
  },
  {
    number: "15 min",
    highlight: true,
    text: "to build your first working AI workflow — not days, not weeks. Minutes.",
  },
];

export default function Stats() {
  return (
    <section className="bg-card py-14 md:py-20 px-4 md:px-10">
      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
        {stats.map((s, i) => (
          <div key={i} className="py-6 md:py-0 md:px-8 first:pt-0 last:pb-0 md:first:pl-0 md:last:pr-0">
            <p className={`font-extrabold text-[40px] md:text-[52px] ${s.highlight ? "text-primary" : "text-foreground"} mb-2 md:mb-3`}>
              {s.number}
            </p>
            <p className="text-[14px] md:text-[15px] text-muted-foreground leading-relaxed">{s.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

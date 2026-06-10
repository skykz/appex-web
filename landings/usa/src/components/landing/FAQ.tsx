import { useState } from "react";

const faqs = [
  {
    q: "Who is Claude, exactly?",
    a: "Claude is Anthropic's AI assistant — and it's quietly become one of the most capable on the planet. It writes like a senior editor, reasons through tough problems, and handles long tasks without losing the plot. That's why teams and freelancers are betting on it.",
  },
  {
    q: "I'm a total beginner. Can I still do this?",
    a: "Absolutely. Appex is built for non-technical folks first. No code, no jargon — just plain-language lessons that move at your pace. If you can use Gmail, you can finish this program.",
  },
  {
    q: "Why not just figure Claude out on my own?",
    a: "You can — most people do, and most people stay stuck at the surface. Appex shortcuts that. We hand you the prompting playbooks, workflow templates, and real use cases that took us months to figure out, so you skip the trial-and-error.",
  },
  {
    q: "Is now really the right time to learn this?",
    a: "It's probably the best window you'll get. The roles, freelance gigs, and side businesses being built around AI right now are going to professionals who started early. Six months from now, the curve gets a lot steeper.",
  },
  {
    q: "How fast will I see results?",
    a: "Faster than you'd think. Most learners are using Claude on real tasks within the first week — saving hours by day 14, and shipping projects clients pay for within 30–60 days.",
  },
  {
    q: "Do I need to pay for Claude separately?",
    a: "Nope, not to start. Claude has a free plan that's enough for most of the program. When a paid tier genuinely helps, we'll point it out — but you don't need it to get going.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-background py-16 md:py-24 px-4 md:px-10">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
        {/* Left: header */}
        <div className="lg:col-span-5">
          <div className="inline-block mb-5 rounded-full px-3.5 py-1.5 text-[11px] font-bold tracking-[0.15em] uppercase text-primary" style={{ background: "rgba(249,115,22,0.10)" }}>
            FAQ
          </div>
          <h2
            className="text-foreground font-extrabold leading-[1.1] mb-4 md:mb-5 tracking-tight"
            style={{ fontSize: "clamp(28px, 4vw, 48px)" }}
          >
            The honest <br className="hidden md:block" />
            <span className="text-primary">answers</span>, upfront
          </h2>
          <p className="text-muted-foreground text-[15px] md:text-[16px] leading-relaxed font-body">
            The questions everyone asks before signing up. If you've got one we missed, hit us up — we read every message.
          </p>
        </div>

        {/* Right: questions */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-border rounded-2xl overflow-hidden">
            {faqs.map((faq, i) => {
              const isOpen = open === i;
              return (
                <div key={i} className={i < faqs.length - 1 ? "border-b border-border" : ""}>
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full flex items-start justify-between gap-4 px-5 md:px-7 py-5 md:py-6 text-left hover:bg-muted/40 transition-colors"
                  >
                    <span className="text-foreground text-[15px] md:text-[16px] font-bold font-body">{faq.q}</span>
                    <svg
                      className={`w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {isOpen && (
                    <div className="px-5 md:px-7 pb-5 md:pb-6 text-muted-foreground text-[14px] md:text-[15px] leading-relaxed font-body">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

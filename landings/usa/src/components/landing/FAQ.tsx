import { useState } from "react";

const faqs = [
  {
    q: "What is Claude?",
    a: "Claude is an advanced AI assistant built by Anthropic. It's known for thoughtful writing, strong reasoning, and reliably handling long, complex tasks — which makes it a powerful tool for real professional work.",
  },
  {
    q: "Do I need any experience to learn Claude?",
    a: "No. Appex teaches Claude from the ground up using plain language and no-code workflows. If you can use everyday web apps, you can follow the program from your first lesson.",
  },
  {
    q: "How is this different from just using Claude on my own?",
    a: "Most people only scratch the surface of what Claude can do. Appex teaches the prompting techniques, workflows, and real use cases that turn Claude from a casual tool into a genuine professional skill.",
  },
  {
    q: "Why are Claude skills worth learning now?",
    a: "AI is reshaping nearly every role, and people who can apply Claude to real work — content, research, automation, and more — stay ahead. Those skills also open the door to paid opportunities.",
  },
  {
    q: "How long until I'm genuinely good with Claude?",
    a: "Lessons are short and practical, so most learners are doing useful, real work with Claude within the first couple of weeks of their personalized plan.",
  },
  {
    q: "Do I need to pay for Claude to start?",
    a: "No. Claude has a free tier that's enough to begin learning. The course points out where a paid plan adds value, but you can start at no extra cost.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" className="bg-background py-16 md:py-24 px-4 md:px-10">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10 md:mb-14">
          <p className="text-primary uppercase text-[11px] tracking-[0.15em] font-semibold mb-3 font-body">
            FAQ
          </p>
          <h2
            className="text-foreground font-extrabold leading-tight mb-3 md:mb-4 tracking-tight"
            style={{ fontSize: "clamp(28px, 4vw, 48px)" }}
          >
            Questions about <span className="text-primary">Claude</span>, answered
          </h2>
          <p className="text-muted-foreground text-sm md:text-base font-body">
            Everything you need to know before you start mastering Claude. Still curious? Reach our team any time.
          </p>
        </div>

        <div className="mb-12 md:mb-16">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-border">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between py-5 md:py-6 text-left"
              >
                <span className="text-foreground text-[15px] md:text-[16px] font-medium font-body pr-4">{faq.q}</span>
                <svg
                  className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {open === i && (
                <div className="pb-5 md:pb-6 text-muted-foreground text-[14px] md:text-[15px] leading-relaxed font-body pr-8">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Contact card */}
        <div className="bg-card border border-border rounded-2xl p-6 md:p-10 text-center">
          <h3 className="text-foreground text-xl md:text-2xl font-bold mb-3">Still have questions?</h3>
          <p className="text-muted-foreground text-[14px] md:text-[15px] mb-2 font-body">
            Feel free to contact our Support Team via the live messenger or email
          </p>
          <a href="mailto:support@appex.me" className="text-primary text-[14px] md:text-[15px] font-medium mb-5 md:mb-6 inline-block font-body">
            support@appex.me
          </a>
          <div>
            <a
              href="mailto:support@appex.me"
              className="w-full sm:w-auto inline-flex justify-center bg-gradient-primary text-white rounded-lg px-6 py-3 text-sm font-semibold hover:opacity-90 transition-opacity font-body"
            >
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

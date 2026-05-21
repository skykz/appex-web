import { useState } from "react";

const faqs = [
  {
    q: "What is Appex?",
    a: "Appex is a hands-on learning platform that teaches you how to build, deploy, and sell AI automations — even with zero coding experience. You'll build real projects and learn how to earn from them.",
  },
  {
    q: "How can I start?",
    a: "Take our free 3-minute quiz to get a personalized learning plan. From there, you'll jump straight into building your first AI workflow — most students finish it in under 15 minutes.",
  },
  {
    q: "Do I need coding experience?",
    a: "Not at all. Our curriculum uses no-code tools like n8n, Google Sheets, and AI APIs. If you can use Gmail, you can build an AI agent.",
  },
  {
    q: "How much can I earn?",
    a: "Students typically earn $500–$3,000/month depending on the services they offer. Some top performers earn over $5,000/month building AI automations for businesses.",
  },
  {
    q: "How can I cancel my subscription?",
    a: "You can cancel anytime from your account settings. No questions asked. We also offer a money-back guarantee if you're not satisfied within the first 14 days.",
  },
  {
    q: "Is there a certificate?",
    a: "Yes! Upon completing the learning path, you'll receive an official Appex AI Automation Specialist certificate that you can add to your LinkedIn profile.",
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
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-sm md:text-base font-body">
            Answers to frequently asked questions.
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

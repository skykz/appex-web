import { useState } from "react";
import { Bot, Headphones, Megaphone, PenTool, CalendarCheck, Network } from "lucide-react";

const tabs = [
  {
    id: "sales",
    label: "AI Sales Agent",
    income: "$500–1,500",
    audience: "For: coaches, SaaS, e-commerce",
    title: "AI Sales Agent",
    desc: "An AI Sales Agent engages prospects through chat and email, qualifies leads, answers questions, and recommends the right offer automatically.",
    checks: ["Qualifies leads via chat & email", "Answers prospect questions 24/7", "Recommends products/services", "Syncs with your CRM"],
    icon: Bot,
    visual: {
      mockTitle: "Lead Qualification Chat",
      mockLines: [
        { from: "user", text: "Hi, I'm interested in your coaching program" },
        { from: "bot", text: "Great! Let me ask a few questions to find the best fit for you. What's your current revenue?" },
        { from: "user", text: "$5k/month" },
        { from: "bot", text: "Perfect! Based on your goals, I recommend our Growth Plan. Shall I book a call?" },
      ],
    },
  },
  {
    id: "support",
    label: "AI Customer Support",
    income: "$400–1,200",
    audience: "For: Shopify stores, service businesses",
    title: "AI Customer Support",
    desc: "Answers support tickets, tracks orders, handles returns and FAQs — all automatically, so your clients never miss a customer.",
    checks: ["Resolves tickets automatically", "Tracks orders in real-time", "Handles returns & refunds", "Escalates complex issues"],
    icon: Headphones,
    visual: {
      mockTitle: "Support Dashboard",
      mockLines: [
        { from: "user", text: "Where's my order #4521?" },
        { from: "bot", text: "Your order shipped yesterday! Tracking: UPS1234. Expected delivery: Friday." },
        { from: "user", text: "Can I change the shipping address?" },
        { from: "bot", text: "I've updated your address. You'll receive a confirmation email shortly." },
      ],
    },
  },
  {
    id: "marketing",
    label: "AI Marketing Manager",
    income: "$600–2,000",
    audience: "For: agencies, local businesses",
    title: "AI Marketing Manager",
    desc: "Writes social media posts, schedules content across platforms, and manages your entire social presence on autopilot.",
    checks: ["Writes engaging posts", "Schedules across platforms", "Analyzes engagement metrics", "Suggests content strategy"],
    icon: Megaphone,
    visual: {
      mockTitle: "Content Calendar",
      mockLines: [
        { from: "bot", text: "📅 Monday: Instagram Reel — '5 Tips for Small Biz Owners'" },
        { from: "bot", text: "📅 Wednesday: LinkedIn Post — Client success story" },
        { from: "bot", text: "📅 Friday: Twitter Thread — Industry trends breakdown" },
        { from: "bot", text: "✅ All posts scheduled. Engagement up 34% this week." },
      ],
    },
  },
  {
    id: "content",
    label: "AI Content Autopilot",
    income: "$800–2,500",
    audience: "For: bloggers, media companies, brands",
    title: "AI Content Autopilot",
    desc: "Generates blog posts, newsletters, and social media content at scale — producing weeks of content in minutes.",
    checks: ["Blog posts & articles", "Weekly newsletters", "Social media at scale", "SEO-optimized output"],
    icon: PenTool,
    visual: {
      mockTitle: "Content Pipeline",
      mockLines: [
        { from: "bot", text: "📝 Generated: '10 AI Tools Every Freelancer Needs' (1,200 words)" },
        { from: "bot", text: "📧 Newsletter draft ready: 'Weekly AI Roundup #14'" },
        { from: "bot", text: "📱 12 social posts created for next 2 weeks" },
        { from: "bot", text: "🔍 All content SEO-scored and optimized." },
      ],
    },
  },
  {
    id: "booking",
    label: "AI Booking Assistant",
    income: "$300–800",
    audience: "For: salons, clinics, restaurants",
    title: "AI Booking Assistant",
    desc: "WhatsApp and SMS appointment booking bot that handles scheduling, reminders, and availability — zero manual work.",
    checks: ["WhatsApp & SMS booking", "Checks real-time availability", "Sends reminders automatically", "Avoids double-bookings"],
    icon: CalendarCheck,
    visual: {
      mockTitle: "WhatsApp Booking",
      mockLines: [
        { from: "user", text: "I'd like to book a haircut for Saturday" },
        { from: "bot", text: "Sure! I have slots at 10am, 1pm, and 3pm. Which works?" },
        { from: "user", text: "1pm please" },
        { from: "bot", text: "✅ Booked! Saturday 1pm with Sarah. You'll get a reminder Friday." },
      ],
    },
  },
  {
    id: "multi",
    label: "Multi-Agent System",
    income: "$2,000–5,000",
    audience: "For: bigger businesses, enterprises",
    title: "Multi-Agent System",
    desc: "Multiple AI agents coordinating together — sales qualifies leads, support handles tickets, marketing runs campaigns, all in sync.",
    checks: ["Multiple agents working together", "Shared knowledge base", "Cross-agent handoffs", "Central dashboard & analytics"],
    icon: Network,
    visual: {
      mockTitle: "Agent Orchestrator",
      mockLines: [
        { from: "bot", text: "🤖 Sales Agent: New lead qualified — passing to onboarding" },
        { from: "bot", text: "🤖 Support Agent: Ticket #892 resolved automatically" },
        { from: "bot", text: "🤖 Marketing Agent: Campaign sent to 2,400 contacts" },
        { from: "bot", text: "📊 All agents synced. Weekly report generated." },
      ],
    },
  },
];

export default function Projects() {
  const [active, setActive] = useState(0);
  const t = tabs[active];
  const Icon = t.icon;

  return (
    <section id="projects" className="bg-background py-16 md:py-24 px-4 md:px-10">
      <div className="max-w-5xl mx-auto">
        <p className="text-primary uppercase text-[11px] tracking-[0.15em] font-semibold mb-3 font-body">
          WHAT YOU'LL ACTUALLY BUILD
        </p>
        <h2 className="text-foreground font-extrabold text-[28px] md:text-[40px] leading-tight mb-8 md:mb-10 tracking-tight">
          Real projects. Real portfolio.{" "}
          <span className="text-primary">Real income.</span>
        </h2>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-2 mb-6 md:mb-8 pb-1 -mx-1 px-1 scrollbar-hide">
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => setActive(i)}
              className={`text-sm px-3 md:px-4 py-2 rounded-full transition-colors font-body whitespace-nowrap flex-shrink-0 ${
                i === active
                  ? "bg-gradient-primary text-white font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content card */}
        <div className="bg-card border border-border rounded-2xl p-5 md:p-10 flex flex-col md:flex-row gap-6 md:gap-8">
          <div className="flex-1">
            <span className="inline-block bg-accent text-accent-foreground text-xs rounded-full px-3 py-1 mb-3 md:mb-4 font-body font-semibold">
              Sells for {t.income}
            </span>
            <h3 className="text-foreground text-xl md:text-2xl font-bold mb-2">{t.title}</h3>
            <p className="text-sm text-muted-foreground mb-1 font-body">{t.audience}</p>
            <p className="text-[14px] md:text-[15px] text-muted-foreground leading-relaxed mb-5 md:mb-6 font-body">{t.desc}</p>
            <ul className="space-y-2.5 md:space-y-3 mb-6 md:mb-8">
              {t.checks.map((c) => (
                <li key={c} className="flex items-center gap-2 text-sm text-muted-foreground font-body">
                  <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {c}
                </li>
              ))}
            </ul>
            <a
              href="/quiz"
              className="w-full sm:w-auto text-center inline-flex justify-center bg-gradient-primary text-white rounded-xl px-6 py-3 text-sm font-semibold hover:opacity-90 transition-opacity font-body"
            >
              Start building →
            </a>
          </div>

          {/* Visual mock */}
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full bg-muted/50 rounded-2xl border border-border p-4 md:p-5">
              {/* Mock header */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-foreground text-sm font-semibold">{t.visual.mockTitle}</span>
                <div className="ml-auto flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-primary/40" />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                </div>
              </div>

              {/* Chat messages */}
              <div className="space-y-3">
                {t.visual.mockLines.map((line, i) => (
                  <div
                    key={i}
                    className={`flex ${line.from === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] text-xs md:text-[13px] leading-relaxed rounded-xl px-3 py-2 ${
                        line.from === "user"
                          ? "bg-primary/20 text-foreground rounded-br-sm"
                          : "bg-card border border-border text-muted-foreground rounded-bl-sm"
                      }`}
                    >
                      {line.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mock input */}
              <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
                <div className="flex-1 h-8 rounded-lg bg-card border border-border" />
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

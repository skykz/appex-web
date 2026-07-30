import { Link, useParams, Navigate } from "react-router-dom";
import { useState } from "react";
import { ArrowRight, Award, Check, ChevronDown, ChevronRight } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { useScrollDepth } from "@/hooks/use-scroll-depth";

type Role = {
  slug: string;
  label: string;
  title: string;
  intro: string;
  whyTitle: string;
  whyBody: string;
  whatTitle: string;
  whatIntro: string;
  whatItems: string[];
  toolsTitle: string;
  toolsIntro: string;
  toolsItems: string[];
  howTitle: string;
  howBody: string;
  howClose: string;
  duration: string;
  lessons: string;
};

const roles: Role[] = [
  {
    slug: "marketers",
    label: "Marketers",
    title: "AI Skills for Marketers",
    intro: "Marketing is being reshaped by AI, and the teams that adopt it ship faster, test more, and stay ahead. AI skills are the most direct way to multiply your output without multiplying headcount.",
    whyTitle: "Why marketers can't ignore AI in 2026",
    whyBody: "Marketing teams are expected to do more with the same budget, and AI is now the difference between keeping up and falling behind. Marketers who can build their own AI workflows ship campaigns faster, personalize at scale, and free themselves from repetitive production work. The ones who cannot are increasingly competing on a speed they cannot match.",
    whatTitle: "What you can do with AI as a marketer",
    whatIntro: "Once you know how to put AI to work, the day-to-day of a marketer changes quickly. With Appex you learn to build practical tools like these:",
    whatItems: [
      "Generate and test ad copy, subject lines, and landing-page variants in minutes",
      "Build an AI agent that drafts on-brand social posts from a single content brief",
      "Automate campaign reporting that pulls the data and writes a plain-English summary",
      "Create a research assistant that monitors competitors, trends, and keywords",
      "Personalize email sequences for different audience segments automatically",
    ],
    toolsTitle: "AI tools every marketer should know",
    toolsIntro: "You do not need every tool at once. For marketers, these are a strong place to start:",
    toolsItems: [
      "ChatGPT and Claude for copy, briefs, and campaign analysis",
      "Make or Zapier to connect your marketing and CRM stack",
      "An AI image tool for fast on-brand creative variations",
    ],
    howTitle: "How Appex helps marketers build real AI skills",
    howBody: "Appex replaces scattered tutorials with a personalized, step-by-step plan. You learn by building working AI agents on real marketing tasks — no coding required — and finish with a certification you can show clients and employers.",
    howClose: "By the end, marketers have a portfolio of AI workflows and the confidence to lead as AI becomes core to the role.",
    duration: "2 weeks",
    lessons: "71",
  },
  {
    slug: "freelancers",
    label: "Freelancers",
    title: "AI Skills for Freelancers",
    intro: "Freelancing is being reshaped by AI, and clients increasingly expect it. AI skills are the most direct way to stay relevant — by delivering more value per hour and offering capabilities few freelancers have.",
    whyTitle: "Why freelancers can't ignore AI in 2026",
    whyBody: "Clients are actively looking for freelancers who can bring AI to their business, and few can. Freelancers who build that skill set add an in-demand capability to their offer and deliver existing work faster. It is one of the clearest ways to stay competitive as AI reshapes freelance work.",
    whatTitle: "What you can do with AI as a freelancer",
    whatIntro: "Once you know how to put AI to work, the day-to-day of a freelancer changes quickly. With Appex you learn to build practical tools like these:",
    whatItems: [
      "Add AI automation as a new capability for existing clients",
      "Build AI agents that handle your own admin, proposals, and follow-up",
      "Deliver client work faster by automating research and first drafts",
      "Create reusable AI systems you can apply across multiple clients",
      "Build a service offer around AI as it becomes a standard client expectation",
    ],
    toolsTitle: "AI tools every freelancer should know",
    toolsIntro: "You do not need every tool at once. For freelancers, these are a strong place to start:",
    toolsItems: [
      "ChatGPT and Claude for delivery, proposals, and research",
      "Make or Zapier to build client automations",
      "A reusable toolkit of agents you refine across projects",
    ],
    howTitle: "How Appex helps freelancers build real AI skills",
    howBody: "Appex replaces scattered tutorials with a personalized, step-by-step plan. You learn by building working AI agents on real tasks — no coding required — and finish with a certification you can show clients and employers.",
    howClose: "Freelancers finish with new AI capabilities and a certification that signals the skill to clients.",
    duration: "2 weeks",
    lessons: "71",
  },
  {
    slug: "small-business-owners",
    label: "Small business owners",
    title: "AI Skills for Small Business Owners",
    intro: "Running a small business means doing everything. AI skills are the most direct way to take hours of repetitive work off your plate and reinvest that time into growth.",
    whyTitle: "Why small business owners can't ignore AI in 2026",
    whyBody: "Your competitors are quietly automating support, marketing, and admin. Owners who learn to wield AI free up hours per week and turn that time into more revenue, not more stress.",
    whatTitle: "What you can do with AI as an owner",
    whatIntro: "Once you know how to put Claude to work, your week looks completely different. With Appex you learn to build practical tools like these:",
    whatItems: [
      "Automate customer support, FAQs, and inbox triage",
      "Generate marketing content, ads, and emails on demand",
      "Build internal SOPs and onboarding flows that run themselves",
      "Use AI agents to handle bookings, follow-ups, and reminders",
    ],
    toolsTitle: "AI tools every owner should know",
    toolsIntro: "You do not need every tool at once. For owners, these are a strong place to start:",
    toolsItems: [
      "Claude for content, support replies, and SOPs",
      "Make or Zapier to connect your existing tools",
      "A library of automations you refine as the business grows",
    ],
    howTitle: "How Appex helps owners build real AI skills",
    howBody: "Appex replaces scattered tutorials with a personalized, step-by-step plan tailored to your business. You learn by building working AI agents on real tasks — no coding required — and finish with a certification and a stack of automations you actually use.",
    howClose: "Owners finish with hours back per week and a stack of AI tools running their business.",
    duration: "2 weeks",
    lessons: "71",
  },
  {
    slug: "customer-support-teams",
    label: "Customer support teams",
    title: "AI Skills for Customer Support Teams",
    intro: "Support teams are the front line of every product. AI skills are the most direct way to resolve more tickets, faster — without sacrificing tone or customer experience.",
    whyTitle: "Why support teams can't ignore AI in 2026",
    whyBody: "Customers expect instant, accurate, on-brand answers. Teams that master Claude cut response times, summarize threads instantly, and free agents to focus on the hard, high-empathy cases.",
    whatTitle: "What you can do with AI in support",
    whatIntro: "Once you know how to put Claude to work, daily support work changes fast. With Appex you learn to build tools like these:",
    whatItems: [
      "Draft on-brand replies in seconds and edit, not write",
      "Summarize long ticket threads and customer history instantly",
      "Auto-tag, route, and prioritize incoming tickets",
      "Generate macros and help-center articles from real conversations",
    ],
    toolsTitle: "AI tools every support team should know",
    toolsIntro: "You do not need every tool at once. For support teams, these are a strong place to start:",
    toolsItems: [
      "Claude for replies, summaries, and knowledge base writing",
      "Make or Zapier to integrate your help desk",
      "A reusable prompt library aligned to your brand voice",
    ],
    howTitle: "How Appex helps support teams build real AI skills",
    howBody: "Appex replaces scattered tutorials with a personalized, step-by-step plan. You learn by building working AI agents on real support tasks — no coding required — and finish with a certification you can show your team or leadership.",
    howClose: "Support teams finish faster, with happier customers and a certification that proves the skill.",
    duration: "2 weeks",
    lessons: "71",
  },
  {
    slug: "sales-professionals",
    label: "Sales professionals",
    title: "AI Skills for Sales Professionals",
    intro: "Sales is being reshaped by AI, and quota-carriers who use it well close more deals with less grind. AI skills are the most direct way to spend more time selling and less time on busywork.",
    whyTitle: "Why sales pros can't ignore AI in 2026",
    whyBody: "Buyers research with AI; the best sellers sell with it too. Reps who master Claude personalize outreach at scale, prep calls in minutes, and follow up without dropping balls.",
    whatTitle: "What you can do with AI in sales",
    whatIntro: "Once you know how to put Claude to work, your pipeline changes fast. With Appex you learn to build tools like these:",
    whatItems: [
      "Generate personalized outreach for entire prospect lists",
      "Prep for any call in 60 seconds with account intel",
      "Draft proposals, follow-ups, and next-step emails on demand",
      "Summarize calls and auto-update your CRM",
    ],
    toolsTitle: "AI tools every seller should know",
    toolsIntro: "You do not need every tool at once. For sales, these are a strong place to start:",
    toolsItems: [
      "Claude for outreach, follow-ups, and proposals",
      "Make or Zapier to sync notes into your CRM",
      "A reusable prompt library tied to your ICP and offer",
    ],
    howTitle: "How Appex helps sellers build real AI skills",
    howBody: "Appex replaces scattered tutorials with a personalized, step-by-step plan. You learn by building working AI agents on real sales tasks — no coding required — and finish with a certification you can show your team or leadership.",
    howClose: "Sellers finish with sharper pipeline, faster cycles, and a certification that proves the skill.",
    duration: "2 weeks",
    lessons: "71",
  },
  {
    slug: "career-changers",
    label: "Career changers",
    title: "AI Skills for Career Changers",
    intro: "Switching careers is hard, but AI levels the playing field. AI skills are the most direct way to build an in-demand, no-code skill set — and open a new path without going back to school.",
    whyTitle: "Why career changers can't ignore AI in 2026",
    whyBody: "Employers are hiring for AI fluency across every industry, and most candidates have none. Career changers who learn Claude bring a rare, immediately useful skill into any new role.",
    whatTitle: "What you can do with AI as a career changer",
    whatIntro: "Once you know how to put Claude to work, your job hunt and first 90 days look very different. With Appex you learn to build tools like these:",
    whatItems: [
      "Show real AI projects in interviews — not just buzzwords",
      "Tailor your CV and cover letters to each role instantly",
      "Hit the ground running with AI workflows from day one",
      "Build a portfolio of working AI agents you can demo live",
    ],
    toolsTitle: "AI tools every career changer should know",
    toolsIntro: "You do not need every tool at once. For career changers, these are a strong place to start:",
    toolsItems: [
      "Claude for writing, research, and demos",
      "Make or Zapier to show real automation in interviews",
      "A small portfolio of agents you keep refining",
    ],
    howTitle: "How Appex helps career changers build real AI skills",
    howBody: "Appex replaces scattered tutorials with a personalized, step-by-step plan. You learn by building working AI agents on real tasks — no coding required — and finish with a certification you can put straight on your CV and LinkedIn.",
    howClose: "Career changers finish with job-ready AI skills and a certification that opens doors.",
    duration: "2 weeks",
    lessons: "71",
  },
  {
    slug: "virtual-assistants",
    label: "Virtual assistants",
    title: "AI Skills for Virtual Assistants",
    intro: "Become an AI-ready VA — master the skills the role now demands and stay ahead of the curve. AI skills are the fastest way to raise your rate and deliver more for every client.",
    whyTitle: "Why VAs can't ignore AI in 2026",
    whyBody: "Clients increasingly expect VAs to bring AI to the table. VAs who master Claude handle more clients, charge more per hour, and become indispensable instead of replaceable.",
    whatTitle: "What you can do with AI as a VA",
    whatIntro: "Once you know how to put Claude to work, your client work changes fast. With Appex you learn to build tools like these:",
    whatItems: [
      "Triage and reply to email on behalf of your clients",
      "Automate scheduling, follow-ups, and reminders",
      "Draft documents, decks, and reports in minutes",
      "Build reusable AI workflows you sell across clients",
    ],
    toolsTitle: "AI tools every VA should know",
    toolsIntro: "You do not need every tool at once. For VAs, these are a strong place to start:",
    toolsItems: [
      "Claude for writing, summaries, and admin",
      "Make or Zapier to automate client systems",
      "A reusable toolkit you refine across clients",
    ],
    howTitle: "How Appex helps VAs build real AI skills",
    howBody: "Appex replaces scattered tutorials with a personalized, step-by-step plan. You learn by building working AI agents on real VA tasks — no coding required — and finish with a certification you can show clients.",
    howClose: "VAs finish with new AI capabilities, higher rates, and a certification that proves the skill.",
    duration: "2 weeks",
    lessons: "71",
  },
  {
    slug: "students",
    label: "Students",
    title: "AI Skills for Students",
    intro: "Graduating into an AI-native economy means AI skills now matter as much as your degree. Appex is the most direct way to enter the job market with rare, in-demand capabilities.",
    whyTitle: "Why students can't ignore AI in 2026",
    whyBody: "Internships and graduate roles increasingly ask for AI fluency. Students who learn Claude stand out in applications, deliver more in their first role, and skip years of catch-up.",
    whatTitle: "What you can do with AI as a student",
    whatIntro: "Once you know how to put Claude to work, study and job hunting change fast. With Appex you learn to build tools like these:",
    whatItems: [
      "Turn lectures, papers, and notes into clear summaries",
      "Build real AI projects to put on your CV and portfolio",
      "Tailor applications to each role in minutes",
      "Use AI agents to manage deadlines, research, and side projects",
    ],
    toolsTitle: "AI tools every student should know",
    toolsIntro: "You do not need every tool at once. For students, these are a strong place to start:",
    toolsItems: [
      "Claude for studying, writing, and research",
      "Make or Zapier for side projects and small businesses",
      "A portfolio of agents you keep building",
    ],
    howTitle: "How Appex helps students build real AI skills",
    howBody: "Appex replaces scattered tutorials with a personalized, step-by-step plan. You learn by building working AI agents on real tasks — no coding required — and finish with a certification you can put on your CV and LinkedIn before graduation.",
    howClose: "Students finish with job-ready AI skills and a certification that gets them noticed.",
    duration: "2 weeks",
    lessons: "71",
  },
];

const bullets = [
  "Use Claude confidently for work, research, and writing",
  "Build reliable prompts and workflows with Claude",
  "Apply Claude to real business and professional tasks",
  "Stay ahead as AI becomes essential in your field",
];

const modules = [
  { title: "Claude basics", lessons: 8 },
  { title: "Prompting Skills", lessons: 8 },
  { title: "Claude at Work", lessons: 9 },
  { title: "Claude Projects", lessons: 8 },
  { title: "Claude Skills", lessons: 7 },
  { title: "Claude Design", lessons: 8 },
  { title: "Claude Code", lessons: 8 },
  { title: "Specialist Level", lessons: 8 },
  { title: "Monetization Tips", lessons: 7 },
];

const faqsByRole: Record<string, { q: string; a: string }[]> = {
  marketers: [
    { q: "Can marketers learn AI without a technical background?", a: "Yes. Appex teaches marketers to build AI agents using no-code tools and visual workflows, so a marketing background is all you need to begin." },
    { q: "Will AI replace marketing jobs?", a: "AI is replacing tasks, not marketers. The marketers who learn to direct AI become more valuable — they ship more, test faster, and focus on strategy instead of production." },
  ],
};

const defaultFaqs = [
  { q: "Do I need a technical background?", a: "No. Appex is built around no-code tools and visual workflows. If you can use Gmail, you can build a working AI agent." },
  { q: "How long does it take to finish?", a: "Most learners finish in about 2 weeks at a comfortable pace — roughly 30–45 minutes a day. You can go faster or slower; the plan adapts." },
];

function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="space-y-3">
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q} className="rounded-2xl overflow-hidden" style={{ background: "#131313", border: "1px solid rgba(255,255,255,0.06)" }}>
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="w-full flex items-center justify-between gap-4 px-5 md:px-6 py-4 md:py-5 text-left"
            >
              <span className="text-foreground font-semibold text-[15px] md:text-[16px]">{f.q}</span>
              <ChevronDown className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform ${isOpen ? "rotate-180 text-primary" : ""}`} />
            </button>
            {isOpen && (
              <div className="px-5 md:px-6 pb-5 text-muted-foreground text-[14px] md:text-[15px] leading-relaxed font-body">
                {f.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function CurriculumItem({ num, title, lessons }: { num: number; title: string; lessons: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative pl-14">
      {/* node */}
      <div className="absolute left-0 top-2 w-10 h-10 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center shadow-lg shadow-primary/30">
        {num}
      </div>
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left rounded-2xl px-5 md:px-6 py-4 md:py-5 flex items-center justify-between gap-4"
        style={{ background: "#131313", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div>
          <p className="text-primary text-[11px] tracking-[0.15em] font-bold uppercase mb-1">Module {num} of 9</p>
          <p className="text-foreground font-bold text-[16px] md:text-[17px]">{title}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-muted-foreground text-sm">{lessons} lessons</span>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${open ? "rotate-180 text-primary" : ""}`} />
        </div>
      </button>
    </div>
  );
}

export default function RoleDetail() {
  const { slug } = useParams();
  const role = roles.find((r) => r.slug === slug);

  // Before the early return below: hooks must run in the same order on every
  // render, and these role pages count as landings for the funnel (App.tsx emits
  // landing_view for /ai-skills-for/* too), so they need the same reach data.
  useScrollDepth();

  if (!role) return <Navigate to="/" replace />;

  const otherRoles = roles.filter((r) => r.slug !== slug).slice(0, 3);

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="px-4 md:px-10 pt-10 md:pt-16 pb-12 md:pb-20">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-[13px] text-muted-foreground font-body mb-8">
            <Link to="/" className="hover:text-primary">Home</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span>AI Skills by Profession</span>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-foreground">{role.label}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-10 lg:gap-14 items-start">
            {/* Left — scrolling content */}
            <div className="space-y-16 md:space-y-20">
              <div>
                <div className="inline-block mb-5 rounded-full px-4 py-1.5 text-[11px] font-bold tracking-[0.15em] uppercase text-primary" style={{ background: "rgba(255,107,0,0.12)", border: "1px solid rgba(255,107,0,0.25)" }}>
                  AI Skills by Profession
                </div>
                <h1
                  className="font-extrabold leading-[1.05] tracking-tight mb-5"
                  style={{ fontSize: "clamp(34px, 5.5vw, 60px)" }}
                >
                  {role.title}
                </h1>
                <p className="text-muted-foreground text-[15px] md:text-[17px] leading-relaxed font-body max-w-xl mb-8">
                  {role.intro}
                </p>

                <div className="flex flex-wrap gap-3">
                  <Link
                    to="/quiz"
                    data-cta="role_hero"
                    className="inline-flex justify-center bg-gradient-primary text-white rounded-full px-7 py-3.5 text-base font-semibold hover:opacity-90 hover:-translate-y-px transition-all"
                  >
                    Start Free Quiz
                  </Link>
                  <a
                    href="#curriculum"
                    className="inline-flex justify-center rounded-full px-7 py-3.5 text-base font-semibold text-foreground border border-border hover:border-primary/60 transition-colors"
                  >
                    View curriculum
                  </a>
                </div>
              </div>

              {/* Why */}
              <div>
                <div className="w-10 h-1 rounded-full bg-primary mb-5" />
                <h2 className="text-foreground text-[24px] md:text-[32px] font-extrabold tracking-tight mb-4">
                  {role.whyTitle}
                </h2>
                <p className="text-muted-foreground text-[15px] md:text-[16px] leading-relaxed font-body">
                  {role.whyBody}
                </p>
              </div>

              {/* What */}
              <div>
                <div className="w-10 h-1 rounded-full bg-primary mb-5" />
                <h2 className="text-foreground text-[24px] md:text-[32px] font-extrabold tracking-tight mb-4">
                  {role.whatTitle}
                </h2>
                <p className="text-muted-foreground text-[15px] md:text-[16px] leading-relaxed font-body mb-7">
                  {role.whatIntro}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {role.whatItems.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-xl p-4" style={{ background: "#131313", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 text-background" strokeWidth={3} />
                      </span>
                      <span className="text-foreground text-[14px] md:text-[15px] font-body leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tools */}
              <div id="curriculum">
                <div className="w-10 h-1 rounded-full bg-primary mb-5" />
                <h2 className="text-foreground text-[24px] md:text-[32px] font-extrabold tracking-tight mb-4">
                  {role.toolsTitle}
                </h2>
                <p className="text-muted-foreground text-[15px] md:text-[16px] leading-relaxed font-body mb-7">
                  {role.toolsIntro}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {role.toolsItems.map((item) => (
                    <div key={item} className="flex items-start gap-3 rounded-xl p-4" style={{ background: "#131313", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <span className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 text-background" strokeWidth={3} />
                      </span>
                      <span className="text-foreground text-[14px] md:text-[15px] font-body leading-snug">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* How */}
              <div>
                <div className="w-10 h-1 rounded-full bg-primary mb-5" />
                <h2 className="text-foreground text-[24px] md:text-[32px] font-extrabold tracking-tight mb-4">
                  {role.howTitle}
                </h2>
                <p className="text-muted-foreground text-[15px] md:text-[16px] leading-relaxed font-body mb-4">
                  {role.howBody}
                </p>
                <p className="text-muted-foreground text-[15px] md:text-[16px] leading-relaxed font-body">
                  {role.howClose}
                </p>
              </div>
            </div>

            {/* Right — sticky info card */}
            <div className="rounded-3xl p-6 md:p-7 lg:sticky lg:top-24" style={{ background: "#131313", border: "1px solid rgba(255,255,255,0.06)", boxShadow: "0 30px 60px -30px rgba(255,107,0,0.3)" }}>
              {/* Visual */}
              <div className="rounded-2xl mb-6 h-44 flex items-center justify-center relative overflow-hidden" style={{ background: "radial-gradient(circle at 30% 40%, rgba(255,107,0,0.35), transparent 60%), #0A0A0A" }}>
                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center text-white font-extrabold text-2xl shadow-lg">
                  A
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-[14px] text-muted-foreground font-body leading-snug">
                    <span className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-primary" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: "Level", value: "All levels" },
                  { label: "Duration", value: role.duration },
                  { label: "Lessons", value: role.lessons },
                  { label: "Certificate", value: "Included" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl px-4 py-3" style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <p className="text-[10px] tracking-[0.15em] uppercase font-bold text-muted-foreground mb-1">{s.label}</p>
                    <p className="text-foreground font-bold text-sm">{s.value}</p>
                  </div>
                ))}
              </div>

              <Link
                to="/quiz"
                data-cta="role_sidebar"
                className="block text-center bg-gradient-primary text-white rounded-full py-3.5 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Start Free Quiz
              </Link>
              <p className="text-center text-[12px] text-muted-foreground mt-3 font-body">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 align-middle" />
                1.9K+ learners enrolled
              </p>
            </div>
          </div>
        </div>
      </section>


      {/* Learning path / curriculum */}
      <section className="px-4 md:px-10 py-16 md:py-24 border-t border-border/40">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex w-14 h-14 rounded-2xl bg-primary items-center justify-center mb-5 shadow-lg shadow-primary/30">
              <Award className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-foreground text-[28px] md:text-[40px] font-extrabold tracking-tight mb-3">
              Your learning path
            </h2>
            <p className="text-muted-foreground text-[14px] md:text-[16px] font-body">
              9 modules · 71 lessons · finish in 2 weeks and earn the Appex AI Certification.
            </p>
          </div>

          <div className="relative space-y-4">
            {/* vertical line */}
            <div className="absolute left-5 top-6 bottom-6 w-px bg-border" />
            {modules.map((m, i) => (
              <CurriculumItem key={m.title} num={i + 1} title={m.title} lessons={m.lessons} />
            ))}

            {/* Finish line node */}
            <div className="relative pl-14">
              <div className="absolute left-0 top-2 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                <Award className="w-5 h-5" />
              </div>
              <div className="rounded-2xl px-5 md:px-6 py-5" style={{ background: "rgba(255,107,0,0.08)", border: "1px solid rgba(255,107,0,0.25)" }}>
                <p className="text-primary text-[11px] tracking-[0.15em] font-bold uppercase mb-2">Finish line</p>
                <p className="text-foreground font-bold text-[16px] md:text-[17px] mb-1">Earn the Appex AI Certification</p>
                <p className="text-muted-foreground text-[14px] leading-relaxed font-body">
                  Complete the path and earn a verifiable certificate you can add to your CV, LinkedIn, and portfolio.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 md:px-10 py-16 md:py-24 border-t border-border/40">
        <div className="max-w-3xl mx-auto">
          <div className="w-10 h-1 rounded-full bg-primary mb-5" />
          <h2 className="text-foreground text-[24px] md:text-[36px] font-extrabold tracking-tight mb-8">
            Frequently asked questions
          </h2>
          <Accordion items={faqsByRole[role.slug] ?? defaultFaqs} />
        </div>
      </section>


      {/* Finish line / cert */}
      <section className="px-4 md:px-10 py-12 md:py-16">
        <div className="max-w-3xl mx-auto rounded-3xl p-7 md:p-9 flex items-start gap-5" style={{ background: "rgba(255,107,0,0.08)", border: "1px solid rgba(255,107,0,0.25)" }}>
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0">
            <Award className="w-6 h-6 text-background" />
          </div>
          <div>
            <p className="text-primary uppercase text-[11px] tracking-[0.15em] font-bold mb-2 font-body">Finish line</p>
            <h3 className="text-foreground text-xl md:text-2xl font-bold tracking-tight mb-2">
              Earn the Appex AI Certification
            </h3>
            <p className="text-muted-foreground text-[14px] md:text-[15px] leading-relaxed font-body">
              Complete the path and earn a verifiable certificate you can add to your CV, LinkedIn, and portfolio.
            </p>
          </div>
        </div>
      </section>

      {/* Other roles */}
      <section className="px-4 md:px-10 py-12 md:py-16 border-t border-border/40">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-foreground text-[22px] md:text-[28px] font-extrabold tracking-tight mb-6 md:mb-8">
            AI skills for other roles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {otherRoles.map((r) => (
              <Link
                key={r.slug}
                to={`/ai-skills-for/${r.slug}`}
                className="group rounded-2xl p-6 transition-all hover:-translate-y-1 hover:border-primary/60"
                style={{ background: "#131313", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-foreground font-bold text-[16px] md:text-[17px] tracking-tight">
                    {r.title}
                  </h3>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-muted-foreground text-[13.5px] leading-snug font-body line-clamp-2">
                  {r.intro}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 md:px-10 py-12 md:py-20">
        <div className="max-w-5xl mx-auto rounded-3xl p-10 md:p-16 text-center" style={{ background: "linear-gradient(135deg, #FF6B00, #FF8A2A)", boxShadow: "0 30px 60px -25px rgba(255,107,0,0.6)" }}>
          <h2 className="text-white font-extrabold leading-[1.05] tracking-tight mb-4" style={{ fontSize: "clamp(28px, 4.2vw, 44px)" }}>
            Ready to build the AI skills <br className="hidden md:block" />
            your future depends on?
          </h2>
          <p className="text-white/85 text-[15px] md:text-[16px] leading-relaxed font-body max-w-xl mx-auto mb-7">
            Take the free 5-minute quiz and get a personalized learning plan built around your goals, schedule, and experience.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/quiz" data-cta="role_footer" className="inline-flex justify-center bg-background text-foreground rounded-full px-7 py-3.5 text-base font-semibold hover:-translate-y-px transition-transform">
              Start Free Quiz
            </Link>
            <Link to="/#projects" className="inline-flex justify-center rounded-full px-7 py-3.5 text-base font-semibold text-white border border-white/40 hover:bg-white/10 transition-colors">
              Browse courses
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

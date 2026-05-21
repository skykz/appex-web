import { useState, useEffect, useRef } from "react";
import applyImg from "@/assets/how-it-works-apply.jpg";

const steps = [
  {
    num: "01",
    title: "Get your personal plan",
    desc: "We learn about your goals and experience so you don't feel lost or overwhelmed.",
    cta: "Get plan →",
  },
  {
    num: "02",
    title: "Learn and build confidence",
    desc: "Follow a clear, hands-on learning path. Practice with AI tools until things start to click.",
    cta: "Learn now →",
  },
  {
    num: "03",
    title: "Apply your skills in real work",
    desc: "Use what you've learned on practical tasks and projects, and feel ready to offer your skills when you choose.",
    cta: "Get started →",
  },
];

const pathNodes = [
  { label: "First AI Chatbot", unlocked: true },
  { label: "AI automation\nstarter kit", unlocked: false },
  { label: "Mastering N8N", unlocked: false },
  { label: "Make\nfoundations", unlocked: false },
  { label: "Monetize\nAI Agents", unlocked: false },
];

function useInView(threshold = 0.25) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function PhoneMockup() {
  return (
    <div className="w-[240px] md:w-[280px] bg-card rounded-[32px] border-[5px] border-border shadow-2xl shadow-black/20 overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-2.5 pb-1">
        <span className="text-[10px] font-semibold text-foreground">9:41</span>
        <div className="w-16 h-4 bg-foreground rounded-full" />
        <div className="flex items-center gap-0.5">
          <span className="text-[9px] text-foreground">●●●</span>
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[13px] font-bold text-foreground">Personal plan</p>
          <span className="text-base">🔥</span>
        </div>
        <p className="text-[10px] text-muted-foreground mb-3 font-body">AI automation and chatbots ›</p>
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-body">On track!</span>
            <span className="text-[10px] text-white bg-primary rounded-full px-1.5 py-0.5 font-semibold">50%</span>
          </div>
          <div className="w-full h-1 bg-muted rounded-full">
            <div className="w-1/2 h-full bg-primary rounded-full" />
          </div>
        </div>
        <p className="text-[12px] font-bold text-foreground mb-2">Courses</p>
        <div className="flex gap-2">
          <div className="flex-1 bg-muted rounded-lg p-2">
            <p className="text-[9px] font-semibold text-foreground mb-0.5 leading-tight">Starter kit: your first step into AI-automation</p>
            <p className="text-[8px] text-primary font-medium font-body">✓ Completed</p>
          </div>
          <div className="flex-1 bg-muted rounded-lg p-2">
            <p className="text-[9px] font-semibold text-muted-foreground mb-0.5 leading-tight">Mastering N8N</p>
            <p className="text-[8px] text-muted-foreground font-body">○ Completed</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LearningPath({ animate }: { animate: boolean }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!animate) return;
    let current = 0;
    const interval = setInterval(() => {
      current++;
      setProgress(current);
      if (current >= pathNodes.length) clearInterval(interval);
    }, 600);
    return () => clearInterval(interval);
  }, [animate]);

  // Positions for the S-curve path (x%, top in px) — alternating left/right
  const positions = [
    { x: 15, y: 0 },
    { x: 65, y: 120 },
    { x: 15, y: 240 },
    { x: 65, y: 360 },
    { x: 15, y: 480 },
  ];

  return (
    <div className="relative w-full max-w-[420px] mx-auto" style={{ height: 560 }}>
      {/* SVG winding path */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 420 560"
        fill="none"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Background path (full trail) */}
        <path
          d="M100 30 C100 90, 320 90, 320 150 C320 210, 100 210, 100 270 C100 330, 320 330, 320 390 C320 450, 100 450, 100 510"
          stroke="hsl(var(--border))"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        {/* Animated progress path (glowing trail) */}
        <path
          d="M100 30 C100 90, 320 90, 320 150 C320 210, 100 210, 100 270 C100 330, 320 330, 320 390 C320 450, 100 450, 100 510"
          stroke="hsl(var(--primary))"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          style={{
            strokeDasharray: 1200,
            strokeDashoffset: animate ? 1200 - (progress / pathNodes.length) * 1200 : 1200,
            transition: "stroke-dashoffset 1.5s ease-out",
            filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.5))",
          }}
        />
      </svg>

      {/* Nodes */}
      {pathNodes.map((node, i) => {
        const pos = positions[i];
        const isReached = progress > i;
        const isActive = progress === i + 1;
        const isFirst = i === 0;
        const isLast = i === pathNodes.length - 1;

        return (
          <div
            key={i}
            className="absolute flex items-center gap-3 transition-all duration-700 ease-out"
            style={{
              left: `${pos.x}%`,
              top: pos.y,
              transform: `translate(-50%, 0) ${animate ? "scale(1)" : "scale(0.6)"}`,
              opacity: animate ? 1 : 0,
              transitionDelay: `${i * 300}ms`,
            }}
          >
            {/* Circle node */}
            <div
              className={`relative w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 ${
                isReached
                  ? "bg-primary shadow-[0_0_20px_hsl(var(--primary)/0.4)]"
                  : "bg-muted/80 border-2 border-border"
              }`}
              style={{ transitionDelay: `${i * 300 + 200}ms` }}
            >
              {/* Pulse ring for active node */}
              {isActive && (
                <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />
              )}
              {isFirst || isReached ? (
                isLast && isReached ? (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )
              ) : (
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </div>

            {/* Label */}
            <p
              className={`text-[13px] md:text-[15px] font-semibold whitespace-pre-line leading-tight transition-colors duration-500 ${
                isReached ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {node.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function StepBlock({ step, index }: { step: typeof steps[0]; index: number }) {
  const { ref, inView } = useInView(0.2);

  return (
    <div
      ref={ref}
      className="transition-all duration-700 ease-out"
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(40px)",
      }}
    >
      {/* Step header */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-[13px] font-semibold text-foreground font-body border border-border transition-all duration-500"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "scale(1) rotate(0deg)" : "scale(0.5) rotate(-10deg)",
            transitionDelay: "100ms",
          }}
        >
          {step.num}
        </span>
        <h3
          className="text-foreground font-bold tracking-tight transition-all duration-500"
          style={{
            fontSize: "clamp(22px, 3vw, 32px)",
            opacity: inView ? 1 : 0,
            transform: inView ? "translateX(0)" : "translateX(-20px)",
            transitionDelay: "200ms",
          }}
        >
          {step.title}
        </h3>
      </div>
      <p
        className="text-muted-foreground text-[14px] md:text-[15px] leading-relaxed mb-6 font-body max-w-md transition-all duration-500"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(15px)",
          transitionDelay: "300ms",
        }}
      >
        {step.desc}
      </p>

      {/* Step visual */}
      <div
        className="transition-all duration-700 ease-out"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0) scale(1)" : "translateY(20px) scale(0.95)",
          transitionDelay: "400ms",
        }}
      >
        {index === 0 && (
          <div className="flex justify-center lg:justify-start">
            <PhoneMockup />
          </div>
        )}
        {index === 1 && <LearningPath animate={inView} />}
        {index === 2 && (
          <img
            src={applyImg}
            alt="People working together on laptops"
            className="w-full max-w-md rounded-2xl object-cover shadow-lg"
            loading="lazy"
            width={800}
            height={600}
          />
        )}
      </div>

      {/* CTA */}
      <div
        className="flex justify-center lg:justify-start mt-8 transition-all duration-500"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(15px)",
          transitionDelay: "600ms",
        }}
      >
        <a
          href="/quiz"
          className="inline-flex bg-gradient-primary text-white rounded-xl px-8 py-3.5 text-sm font-semibold hover:opacity-90 transition-opacity font-body"
        >
          {step.cta}
        </a>
      </div>
    </div>
  );
}

export default function HowItWorks() {
  const { ref: headerRef, inView: headerVisible } = useInView(0.3);

  return (
    <section id="how-it-works" className="bg-card py-16 md:py-24 px-4 md:px-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-20">
          {/* Left — sticky heading */}
          <div
            ref={headerRef}
            className="lg:w-[400px] lg:sticky lg:top-24 lg:self-start flex flex-col justify-center text-center lg:text-left transition-all duration-700 ease-out"
            style={{
              opacity: headerVisible ? 1 : 0,
              transform: headerVisible ? "translateX(0)" : "translateX(-30px)",
            }}
          >
            <p className="text-primary uppercase text-[11px] tracking-[0.15em] font-semibold mb-3 font-body">
              HOW IT WORKS
            </p>
            <h2
              className="text-foreground font-extrabold leading-[1.05] mb-5 tracking-tight"
              style={{ fontSize: "clamp(36px, 5vw, 60px)" }}
            >
              How <span className="text-primary">Appex</span>
              <br />
              works
            </h2>
            <p className="text-muted-foreground text-[15px] md:text-[17px] leading-relaxed mb-8 font-body max-w-sm mx-auto lg:mx-0">
              Simple learning process designed to help you build real AI skills without feeling overwhelmed.
            </p>
            <div className="flex justify-center lg:justify-start">
              <a
                href="/quiz"
                className="inline-flex bg-gradient-primary text-white rounded-full px-10 py-4 text-base font-semibold hover:opacity-90 transition-opacity font-body"
              >
                Get plan →
              </a>
            </div>
          </div>

          {/* Right — steps */}
          <div className="flex-1 flex flex-col gap-16">
            {steps.map((st, i) => (
              <StepBlock key={st.num} step={st} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QuizProvider } from "@/contexts/QuizContext";

function QuizResultInner() {
  const navigate = useNavigate();

  const saved = sessionStorage.getItem("appexQuiz");
  const answers = saved ? JSON.parse(saved).answers : null;

  useEffect(() => {
    if (!answers) navigate("/quiz");
  }, [answers, navigate]);

  if (!answers) return null;

  const { goal, incomeTarget, timeline } = answers;

  let role = "AI Automation Specialist";
  if (goal === "Start an AI Automation business") role = "AI Solutions Architect";
  else if (goal === "Quit my 9–5 and be my own boss" || timeline === "Within 1 month") role = "AI Agent Builder";
  else if (incomeTarget === "$3,000+/month") role = "AI Operations Manager";

  const incomeMap: Record<string, string> = {
    "$500–$1,000/month": "$500–1k/mo",
    "$1,000–$2,000/month": "$1k–2k/mo",
    "$2,000–$3,000/month": "$2k–3k/mo",
    "$3,000+/month": "$3k+/mo",
  };
  const timelineMap: Record<string, string> = {
    "Within 1 month": "30 days",
    "1–2 months": "60 days",
    "2–3 months": "90 days",
    "I'd test it first": "your pace",
  };

  const incomeDisplay = incomeMap[incomeTarget] || "$1k–2k/mo";
  const timelineDisplay = timelineMap[timeline] || "60 days";

  const handleCTA = () => {
    const params = new URLSearchParams({ role, income: incomeTarget || "", timeline: timeline || "" });
    navigate("/paywall");
  };

  const pathItems = [
    { title: "Course 1: Start Your Automation Journey", sub: "Build your first AI workflow", active: true },
    { title: "Course 2: Launch Inventory Agent", sub: "First real portfolio project", active: true },
    { title: "Course 7: Monetize AI Agents", sub: "Sales playbook + first client", active: true },
    { title: "AI Jobs Board — coming soon", sub: "Match with companies hiring AI operators", active: false },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Progress bar - 100% */}
      <div className="w-full h-[3px] bg-border">
        <div className="h-[3px] bg-gradient-primary w-full" />
      </div>

      <div className="mx-auto text-center" style={{ maxWidth: 560, padding: "40px 24px 80px" }}>
        {/* Badge */}
        <div className="inline-block mb-5 text-[13px] font-semibold rounded-full bg-accent text-primary border border-primary/25 px-5 py-1.5">
          Your plan is ready
        </div>

        {/* Headline */}
        <h1 className="text-[26px] leading-snug mb-2.5 text-foreground font-extrabold tracking-tight">
          You're on the path to become an<br />
          <span className="text-primary">{role}</span>
        </h1>
        <p className="text-[14px] mb-7 text-muted-foreground">Built for your schedule, your goal, and your starting point.</p>

        {/* Stat boxes */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[{ num: incomeDisplay, label: "your income target" }, { num: timelineDisplay, label: "to first project" }].map((s) => (
            <div key={s.label} className="rounded-xl text-center bg-card border border-border p-[18px]">
              <div className="text-[24px] font-bold mb-1 text-primary">{s.num}</div>
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground" style={{ letterSpacing: "0.08em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Learning path */}
        <div className="text-left rounded-xl mb-5 bg-card border border-border p-[22px]">
          <div className="text-[10px] uppercase tracking-widest mb-4 text-muted-foreground" style={{ letterSpacing: "0.12em" }}>YOUR RECOMMENDED PATH</div>
          <div className="flex flex-col gap-3.5">
            {pathItems.map((item) => (
              <div key={item.title} className="flex gap-3 items-start">
                <div className={`w-2 h-2 rounded-full mt-[5px] flex-shrink-0 ${item.active ? "bg-primary" : "bg-muted-foreground/30"}`} />
                <div>
                  <div className={`text-[14px] font-medium ${item.active ? "text-foreground" : "text-muted-foreground"}`}>{item.title}</div>
                  <div className="text-[12px] mt-0.5 text-muted-foreground">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleCTA}
          className="w-full text-[16px] font-semibold rounded-xl py-4 border-none cursor-pointer mb-3 transition-opacity duration-200 bg-gradient-primary text-white hover:opacity-90"
        >
          Start building — get my plan →
        </button>

        {/* Trust */}
        <p className="text-[12px] text-muted-foreground">
          ✓ No coding needed &nbsp;·&nbsp; ✓ Cancel anytime &nbsp;·&nbsp; ✓ 7-day money-back
        </p>
      </div>
    </div>
  );
}

export default function QuizResult() {
  return (
    <QuizProvider>
      <QuizResultInner />
    </QuizProvider>
  );
}

import { useState } from "react";

const options = [
  "Quit my 9-5 and work for myself",
  "Start an AI Automation business",
  "Build an additional income stream",
];

/** Dashboard mockup figures (must match monthly goal row). */
const DASHBOARD_EARNED = 1200;
const DASHBOARD_GOAL = 2000;

/**
 * Formats a USD amount for the hero dashboard mockup.
 */
function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`;
}

/**
 * Renders the Sarah dashboard card shown beside the hero CTA.
 */
function DashboardMockup() {
  return (
    <div
      className="w-full max-w-[420px] mx-auto rounded-[20px] p-7 opacity-0 animate-[fade-up_0.8s_ease-out_0.2s_forwards]"
      style={{
        background: "#131313",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Greeting */}
      <div className="mb-5">
        <p className="text-foreground text-[16px] font-bold">Welcome back, Sarah 👋</p>
        <p className="text-[12px] font-body" style={{ color: "#666" }}>AI Automation Specialist</p>
      </div>

      {/* Stats row — middle column wider so "$1,200" fits */}
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)_minmax(0,1fr)] gap-2 mb-5">
        {[
          { value: 3, label: "Agents active", live: true },
          { value: DASHBOARD_EARNED, label: "Earned this month", prefix: "$", compact: true },
          { value: 12, label: "Clients served" },
        ].map((s) => (
          <div
            key={s.label}
            className="min-w-0 rounded-xl px-2 py-3.5 text-center"
            style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div
              className={`text-primary font-black leading-none mb-1 relative tabular-nums tracking-tight ${
                s.compact ? "text-[20px]" : "text-[24px]"
              }`}
            >
              <span className="block whitespace-nowrap">
                {s.prefix}
                {s.value.toLocaleString("en-US")}
              </span>
              {s.live && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              )}
            </div>
            <div className="text-[9px] md:text-[10px] font-body leading-tight" style={{ color: "#888" }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Agent list */}
      <p className="text-foreground text-[13px] font-bold mb-3">Your agents</p>
      <div className="flex flex-col gap-2 mb-5">
        {[
          { name: "WhatsApp Booking Bot", badge: "24/7 active" },
          { name: "AI Sales Agent", badge: "142 chats this week" },
          { name: "Content Autopilot", badge: "30 posts scheduled" },
        ].map((agent) => (
          <div
            key={agent.name}
            className="flex items-center justify-between rounded-[10px] px-4 py-3"
            style={{ background: "#111", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              <span className="text-foreground text-[13px] font-semibold">{agent.name}</span>
            </div>
            <span className="text-[11px] rounded-md px-2 py-0.5 font-body" style={{ color: "#888", background: "#1A1A1A" }}>
              {agent.badge}
            </span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-body" style={{ color: "#888" }}>Monthly goal</span>
          <span className="text-[11px] text-foreground font-semibold">
            {formatUsd(DASHBOARD_EARNED)} / {formatUsd(DASHBOARD_GOAL)}
          </span>
        </div>
        <div className="w-full h-1.5 rounded-full" style={{ background: "#1A1A1A" }}>
          <div
            className="h-1.5 rounded-full"
            style={{
              width: `${(DASHBOARD_EARNED / DASHBOARD_GOAL) * 100}%`,
              background: "linear-gradient(90deg, #FF6B00, #FFB800)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Landing hero with quiz-style intent checkboxes and dashboard preview.
 */
export default function Hero() {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (opt: string) =>
    setSelected((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );

  return (
    <section className="bg-background min-h-[85vh] md:min-h-[90vh] pt-[80px] md:pt-[140px] pb-12 md:pb-20 px-4 md:px-10">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start gap-8 lg:gap-20">
        {/* Left */}
        <div className="flex-1 max-w-xl">
          <h1
            className="text-foreground font-extrabold leading-[1.05] mb-4 md:mb-6 tracking-tight"
            style={{ fontSize: "clamp(36px, 5vw, 72px)" }}
          >
            Turn AI skills into{" "}
            <span className="text-primary">real income.</span>
          </h1>

          {/* Quiz-style checkboxes */}
          <div className="mb-5 md:mb-6">
            <h3 className="text-foreground text-base md:text-lg font-semibold mb-3 font-body">
              What brings you to Appex?
            </h3>
            <div className="flex flex-col gap-1.5">
              {options.map((opt) => {
                const isSelected = selected.includes(opt);
                return (
                  <button
                    key={opt}
                    onClick={() => toggle(opt)}
                    className={`flex items-center gap-3 text-left text-[14px] md:text-[15px] rounded-lg px-3 md:px-4 py-2.5 md:py-3 transition-colors font-body ${
                      isSelected
                        ? "bg-card text-foreground border border-primary/30"
                        : "bg-card/50 text-muted-foreground hover:bg-card border border-transparent"
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-muted-foreground/40"
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4 mb-6 md:mb-8">
            <a
              href="/quiz"
              className="w-full sm:w-auto text-center inline-flex justify-center bg-gradient-primary text-white rounded-xl px-7 py-3.5 text-base font-semibold hover:opacity-90 hover:-translate-y-px transition-all"
            >
              Get your free plan →
            </a>
          </div>

          {/* Trust row */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-6">
            {["No coding required", "First workflow in 15 min"].map((t) => (
              <span key={t} className="flex items-center gap-2 text-[12px] md:text-[13px] text-muted-foreground">
                <svg className="w-4 h-4 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Right — dashboard mockup (desktop) */}
        <div className="hidden lg:block flex-1 relative">
          <DashboardMockup />
        </div>
      </div>
    </section>
  );
}

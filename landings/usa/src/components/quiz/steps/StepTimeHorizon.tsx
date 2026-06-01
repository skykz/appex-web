import { useState } from "react";
import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";

const OPTIONS = [
  { label: "In the next 30 days", icon: "⚡", desc: "Fast track — I'm ready to start now" },
  { label: "1–3 months", icon: "📅", desc: "Steady pace — building habits" },
  { label: "3–6 months", icon: "🎯", desc: "Long game — deep mastery" },
  { label: "I'm just exploring", icon: "🔍", desc: "No pressure — just curious" },
];

export default function StepTimeHorizon() {
  const { answers, setAnswer, nextStep } = useQuiz();
  const [selected, setSelected] = useState(answers.time_horizon || "");

  const handleSelect = (label: string) => {
    setSelected(label);
    setAnswer("time_horizon", label);
    setTimeout(nextStep, 320);
  };

  return (
    <div>
      <p className="text-[13px] font-semibold tracking-widest uppercase mb-3" style={{ color: '#F97316' }}>
        One last thing
      </p>
      <h2 className="text-[26px] sm:text-[30px] font-extrabold mb-2 leading-tight" style={{ color: '#111' }}>
        How soon do you want to see results?
      </h2>
      <p className="text-[14px] mb-6" style={{ color: '#6B7280' }}>
        We'll tailor your roadmap to your timeline.
      </p>

      <div className="flex flex-col gap-3">
        {OPTIONS.map((o) => {
          const isSelected = selected === o.label;
          return (
            <button
              key={o.label}
              type="button"
              onClick={() => handleSelect(o.label)}
              className="w-full text-left flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-150 cursor-pointer"
              style={{
                border: isSelected ? '2px solid #111' : '1.5px solid #E5E5E5',
                background: isSelected ? '#111' : '#fff',
              }}
            >
              <span className="text-[24px] flex-shrink-0">{o.icon}</span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold leading-snug" style={{ color: isSelected ? '#fff' : '#111' }}>
                  {o.label}
                </p>
                <p className="text-[12px] mt-0.5" style={{ color: isSelected ? '#ccc' : '#9CA3AF' }}>
                  {o.desc}
                </p>
              </div>
              {isSelected && (
                <span className="ml-auto flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#F97316' }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <ContinueButton onClick={nextStep} disabled={!selected} />
      </div>
    </div>
  );
}

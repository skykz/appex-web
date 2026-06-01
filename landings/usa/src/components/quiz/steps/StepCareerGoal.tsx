import { useState } from "react";
import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";

const OPTIONS = [
  { emoji: "💼", label: "Land a new job" },
  { emoji: "🚀", label: "Get promoted in my current role" },
  { emoji: "💻", label: "Start freelancing" },
  { emoji: "🏠", label: "Work from home / remote" },
  { emoji: "🤖", label: "Future-proof my skills before AI changes my job" },
  { emoji: "✨", label: "Build my own business" },
];

export default function StepCareerGoal() {
  const { answers, setAnswer, nextStep } = useQuiz();
  const [selected, setSelected] = useState(answers.career_goal || "");

  const handleSelect = (label: string) => {
    setSelected(label);
    setAnswer("career_goal", label);
    setTimeout(nextStep, 320);
  };

  return (
    <div>
      <p className="text-[13px] font-semibold tracking-widest uppercase mb-3" style={{ color: '#F97316' }}>
        Almost there
      </p>
      <h2 className="text-[26px] sm:text-[30px] font-extrabold mb-2 leading-tight" style={{ color: '#111' }}>
        What do you want Claude to help you achieve?
      </h2>
      <p className="text-[14px] mb-6" style={{ color: '#6B7280' }}>
        Pick the goal that matters most to you right now.
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
              <span className="text-[26px] flex-shrink-0">{o.emoji}</span>
              <span
                className="text-[15px] font-medium leading-snug"
                style={{ color: isSelected ? '#fff' : '#111' }}
              >
                {o.label}
              </span>
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

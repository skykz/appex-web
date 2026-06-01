import { useQuiz } from "@/contexts/QuizContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, ReactNode } from "react";

const TABS = [
  { label: "My profile", end: 4 },
  { label: "Challenges", end: 14 },
  { label: "Personalization", end: 37 },
];

// Steps beyond tab 3 (step > 37) show no tabs
function activeTabIndex(step: number) {
  for (let i = 0; i < TABS.length; i++) {
    if (step <= TABS[i].end) return i;
  }
  return -1; // beyond all tabs
}

export default function QuizShell({ children }: { children: ReactNode }) {
  const { currentStep, totalSteps, maxReachedStep, prevStep } = useQuiz();
  const navigate = useNavigate();
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [displayed, setDisplayed] = useState<{ key: number; node: ReactNode }>({ key: currentStep, node: children });
  const [isExiting, setIsExiting] = useState(false);
  const prevStepRef = useRef(currentStep);

  useEffect(() => {
    if (currentStep !== prevStepRef.current) {
      const dir = currentStep > prevStepRef.current ? "forward" : "back";
      setDirection(dir);
      setIsExiting(true);

      const timeout = setTimeout(() => {
        setIsExiting(false);
        setDisplayed({ key: currentStep, node: children });
        prevStepRef.current = currentStep;
      }, 180);

      return () => clearTimeout(timeout);
    } else {
      setDisplayed({ key: currentStep, node: children });
    }
  }, [currentStep, children]);

  const activeIdx = activeTabIndex(currentStep);
  const ORANGE = "#F97316";

  const handleBack = () => {
    if (currentStep === 1) {
      navigate("/quiz");
    } else {
      prevStep();
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF' }}>
      <div className="fixed top-0 left-0 right-0 z-[100] flex items-center h-[52px]" style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E5E5' }}>
        <button onClick={handleBack} aria-label="Back" className="px-4 sm:px-5 text-[22px] leading-none cursor-pointer bg-transparent border-none min-h-[44px] min-w-[44px] flex items-center justify-center" style={{ color: '#111' }}>
          ‹
        </button>
        <div className="flex-1 flex items-center justify-center select-none">
          <span className="font-extrabold text-[20px] sm:text-[22px] tracking-tight" style={{ color: '#111' }}>App</span>
          <span className="font-extrabold text-[20px] sm:text-[22px] tracking-tight" style={{ color: ORANGE }}>ex</span>
        </div>
        <div className="px-4 sm:px-5 w-[44px]" />
      </div>

      {activeIdx >= 0 && (
        <div className="mt-[52px] px-2 sm:px-4 pt-2" style={{ background: '#FFFFFF' }}>
          <div className="flex gap-1 sm:gap-3">
            {TABS.map((t, i) => {
              const isActive = i === activeIdx;
              const isPast = i < activeIdx;
              const start = i === 0 ? 1 : TABS[i - 1].end + 1;
              const span = t.end - start + 1;
              const inTabProgress = isActive
                ? Math.min(Math.max((maxReachedStep - start + 1) / span, 0), 1)
                : isPast ? 1 : 0;
              return (
                <div key={t.label} className="flex-1 min-w-0 flex flex-col items-center">
                  <span
                    className="block w-full text-center text-[10px] sm:text-[12px] font-semibold truncate mb-1.5"
                    style={{ color: isActive || isPast ? '#111' : '#9CA3AF' }}
                  >
                    {t.label}
                  </span>
                  <div className="w-full h-[3px] rounded-full overflow-hidden" style={{ background: '#E5E5E5' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${inTabProgress * 100}%`,
                        background: ORANGE,
                        transition: 'width 500ms cubic-bezier(0.22, 1, 0.36, 1)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {activeIdx < 0 && <div className="mt-[52px]" />}

      <div className="mx-auto w-full" style={{ maxWidth: 600 }}>
        <div className="px-5 sm:px-6 pt-8 sm:pt-10 pb-[120px]">
        <div
          key={displayed.key}
          className={isExiting ? "animate-slide-quiz-out" : "animate-slide-quiz"}
          style={{
            "--slide-from": direction === "forward" ? "24px" : "-24px",
            "--slide-to": direction === "forward" ? "-24px" : "24px",
          } as React.CSSProperties}
        >
          {displayed.node}
        </div>
        </div>
      </div>
    </div>
  );
}

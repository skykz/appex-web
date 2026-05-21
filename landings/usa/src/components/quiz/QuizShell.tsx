import { useQuiz } from "@/contexts/QuizContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, ReactNode } from "react";

function getPartLabel(step: number) {
  if (step <= 4) return "My profile";
  if (step <= 12) return "Your mindset";
  if (step <= 16) return "Income Goals";
  if (step <= 21) return "Career & Lifestyle";
  if (step <= 33) return "AI Skills";
  if (step <= 43) return "Development & Motivation";
  return "Final steps";
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

  const progressPct = (maxReachedStep / totalSteps) * 100;
  const segmentCount = 6;

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
        <button onClick={handleBack} className="px-5 text-[20px] cursor-pointer bg-transparent border-none" style={{ color: '#111' }}>
          ‹
        </button>
        <div className="flex-1 text-center text-sm font-semibold" style={{ color: '#111' }}>
          {getPartLabel(currentStep)}
        </div>
        <div className="px-5 w-[44px]" />
      </div>

      <div className="flex gap-1.5 px-4 mt-[52px] pt-1 pb-0" style={{ background: '#FFFFFF' }}>
        {Array.from({ length: segmentCount }).map((_, i) => {
          const segSize = 100 / segmentCount;
          const segmentProgress = Math.min(Math.max((progressPct - i * segSize) / segSize, 0), 1);
          return (
            <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: '#E0E0E0' }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${segmentProgress * 100}%`,
                  background: 'linear-gradient(90deg, #2563EB, #3B82F6)',
                  transition: 'width 500ms cubic-bezier(0.22, 1, 0.36, 1)',
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="mx-auto" style={{ maxWidth: 600, padding: "40px 24px 120px" }}>
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
  );
}

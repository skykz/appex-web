import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";

export default function StepInterstitial2() {
  const { answers, nextStep } = useQuiz();

  // Show "no coding" encouragement if they said No, otherwise generic
  const noCoding = answers.codingExperience === "No";

  return (
    <div className="text-center">
      <h2 className="text-[26px] font-extrabold mb-3" style={{ color: '#111' }}>
        {noCoding ? "No coding? No problem!" : "You're on the right track!"}
      </h2>
      <p className="text-[15px] mb-8 leading-relaxed max-w-md mx-auto" style={{ color: '#666' }}>
        {noCoding
          ? "With Appex you can master AI in just 2 weeks! No coding needed, no degree needed – just use our step-by-step guide."
          : "Your coding background gives you an edge. Appex will help you turn those skills into real AI income even faster."}
      </p>

      <div className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden mb-8" style={{ background: '#F5F5F5' }}>
        <div className="aspect-[4/3] flex items-center justify-center">
          <div className="text-center px-6">
            <div className="text-[48px] mb-3">💻</div>
            <p className="text-[14px] font-medium" style={{ color: '#666' }}>
              {noCoding ? "No tech skills needed. We guide every step." : "Level up your skills with AI automation."}
            </p>
          </div>
        </div>
      </div>

      <ContinueButton onClick={nextStep} />
    </div>
  );
}

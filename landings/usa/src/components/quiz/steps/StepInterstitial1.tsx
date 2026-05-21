import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";

export default function StepInterstitial1() {
  const { nextStep } = useQuiz();

  return (
    <div className="text-center">
      <h2 className="text-[26px] font-extrabold mb-3" style={{ color: '#111' }}>
        We know how to help you!
      </h2>
      <p className="text-[15px] mb-8 leading-relaxed max-w-md mx-auto" style={{ color: '#666' }}>
        Appex will teach you step-by-step how to make money online using AI and help you enhance your potential!
      </p>

      {/* Placeholder image */}
      <div className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden mb-8" style={{ background: '#F5F5F5' }}>
        <div className="aspect-[4/3] flex items-center justify-center">
          <div className="text-center px-6">
            <div className="text-[48px] mb-3">🤝</div>
            <p className="text-[14px] font-medium" style={{ color: '#666' }}>
              Real people. Real results. Your turn next.
            </p>
          </div>
        </div>
      </div>

      <ContinueButton onClick={nextStep} />
    </div>
  );
}

import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";

export default function StepInterstitial3() {
  const { nextStep } = useQuiz();

  return (
    <div className="text-center">
      <h2 className="text-[26px] font-extrabold mb-3" style={{ color: '#111' }}>
        Leave Financial Stress and Worries Behind!
      </h2>
      <p className="text-[15px] mb-8 leading-relaxed max-w-md mx-auto" style={{ color: '#666' }}>
        You can start building AI chatbots with us and sell each for an average of <strong style={{ color: '#111' }}>$2,000</strong>.
      </p>

      {/* Income growth visual */}
      <div className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden mb-4" style={{ background: '#F5F5F5', border: '1px solid #E5E5E5' }}>
        <div className="p-5">
          {/* Mini chart visual */}
          <div className="flex items-end justify-between gap-2 mb-4 h-[120px] px-4">
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="w-full rounded-t-md" style={{ height: '30px', background: '#E0E0E0' }} />
              <span className="text-[10px]" style={{ color: '#999' }}>Mar</span>
            </div>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="w-full rounded-t-md" style={{ height: '55px', background: '#FFD666' }} />
              <span className="text-[10px]" style={{ color: '#999' }}>Apr</span>
            </div>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="w-full rounded-t-md" style={{ height: '80px', background: '#66D9A0' }} />
              <span className="text-[10px]" style={{ color: '#999' }}>May</span>
            </div>
            <div className="flex flex-col items-center gap-1 flex-1">
              <div className="w-full rounded-t-md" style={{ height: '110px', background: '#1D9E75' }} />
              <span className="text-[10px]" style={{ color: '#999' }}>Jun</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-[18px]">💰</span>
            <span className="text-[15px] font-bold" style={{ color: '#111' }}>Income Growth</span>
            <span className="text-[18px]">📈</span>
          </div>
        </div>
      </div>

      <p className="text-[11px] mb-8 max-w-sm mx-auto leading-relaxed" style={{ color: '#AAA' }}>
        This course is for educational purposes only and does not guarantee specific results. Success depends on individual effort and application.
      </p>

      <ContinueButton onClick={nextStep} />
    </div>
  );
}

import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";

export default function StepInterstitial4() {
  const { nextStep } = useQuiz();

  return (
    <div className="text-center">
      <h2 className="text-[26px] font-extrabold mb-3" style={{ color: '#111' }}>
        Imagine building AI chatbots
      </h2>
      <p className="text-[15px] mb-8 leading-relaxed max-w-md mx-auto" style={{ color: '#666' }}>
        Setting up one chatbot takes as little as <strong style={{ color: '#111' }}>2 hours</strong>, depending on the complexity — and can get you anywhere from <strong style={{ color: '#111' }}>$2,000 to $10,000</strong>
      </p>

      {/* Side-by-side visual */}
      <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-4">
        {/* Left: Before */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#F5F5F5', border: '1px solid #E5E5E5' }}>
          <div className="p-4 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#E5E5E5' }}>
              <span className="text-[28px]">📱</span>
            </div>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: '#D1FAE5', color: '#065F46' }}
            >
              ⏳ 4 hours
            </span>
            <p className="text-[12px]" style={{ color: '#888' }}>Browsing social media</p>
          </div>
        </div>

        {/* Right: After */}
        <div className="rounded-2xl overflow-hidden" style={{ background: '#F0FFF4', border: '1px solid #BBF7D0' }}>
          <div className="p-4 flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#D1FAE5' }}>
              <span className="text-[28px]">🤖</span>
            </div>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ background: '#D1FAE5', color: '#065F46' }}
            >
              ⏳ 2 hours
            </span>
            <div className="flex flex-col gap-1.5 w-full">
              {["Sales bot", "Marketing bot", "Support bot"].map((bot) => (
                <div
                  key={bot}
                  className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-left"
                  style={{ background: '#FFFFFF', border: '1px solid #E5E5E5', color: '#333' }}
                >
                  🤖 {bot}
                </div>
              ))}
            </div>
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

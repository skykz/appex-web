import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";

export default function StepInterstitial5() {
  const { nextStep } = useQuiz();
  return (
    <div className="text-center">
      <h2 className="text-[26px] font-extrabold mb-4" style={{ color: '#111' }}>
        Get free access to 15+ AI tools from Appex
      </h2>
      <p className="text-[15px] mb-8" style={{ color: '#555' }}>
        Text, images, video, voice automation, and more — all in one place!
      </p>
      {/* Phone mockup */}
      <div className="mx-auto mb-8 w-[220px] rounded-[28px] border-[3px] border-[#222] overflow-hidden" style={{ background: '#F8F8F8' }}>
        <div className="px-4 pt-5 pb-2">
          <div className="flex gap-2 mb-4">
            <span className="px-3 py-1 rounded-full text-[12px] font-semibold" style={{ background: '#111', color: '#fff' }}>AI Tools</span>
            <span className="px-3 py-1 rounded-full text-[12px] font-semibold" style={{ background: '#eee', color: '#555' }}>Prompts</span>
          </div>
          {["GPT-4o", "Grok-1", "Llama 3", "Claude 3", "Gemini Pro"].map((m) => (
            <div key={m} className="flex items-center justify-between py-2 border-b" style={{ borderColor: '#eee' }}>
              <span className="text-[13px] font-medium" style={{ color: '#111' }}>{m}</span>
              <span className="text-[11px] px-3 py-1 rounded-full font-semibold" style={{ background: '#111', color: '#fff' }}>Use</span>
            </div>
          ))}
        </div>
        <div className="h-[80px] mx-3 mb-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <div className="flex items-center justify-center h-full text-white text-[11px] font-semibold">AI Image Preview</div>
        </div>
      </div>
      <ContinueButton onClick={nextStep} />
    </div>
  );
}

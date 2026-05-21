import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";

export default function StepInterstitial6() {
  const { nextStep } = useQuiz();
  return (
    <div className="text-center">
      <h2 className="text-[26px] font-extrabold mb-6" style={{ color: '#111' }}>AI Chatbot for Customer Support</h2>
      {/* Phone mockup */}
      <div className="mx-auto mb-6 w-[240px] rounded-[24px] overflow-hidden border-[3px] border-[#222]" style={{ background: '#ECE5DD' }}>
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: '#075E54' }}>
          <div className="w-8 h-8 rounded-full" style={{ background: '#25D366' }} />
          <span className="text-white text-[13px] font-semibold">TrendyWear Bot</span>
        </div>
        <div className="px-3 py-3 space-y-2">
          <div className="bg-white rounded-lg px-3 py-2 text-[12px] text-left max-w-[85%]" style={{ color: '#111' }}>
            Hi! 👋 How can I help you today?
          </div>
          <div className="rounded-lg px-3 py-2 text-[12px] text-right ml-auto max-w-[85%]" style={{ background: '#DCF8C6', color: '#111' }}>
            Where's my order #4521?
          </div>
          <div className="bg-white rounded-lg px-3 py-2 text-[12px] text-left max-w-[85%]" style={{ color: '#111' }}>
            Your order #4521 is out for delivery! Expected arrival: Today by 5 PM 📦
          </div>
        </div>
      </div>
      <div className="text-left mx-auto" style={{ maxWidth: 400 }}>
        <p className="text-[18px] font-bold mb-3" style={{ color: '#111' }}>💰 Freelancer Cost: $500 – $5,000</p>
        <ul className="space-y-2 text-[14px] mb-6" style={{ color: '#444' }}>
          <li>✅ Answers customer inquiries 24/7</li>
          <li>✅ Handles order tracking and issue resolution</li>
          <li>✅ Integrates with WhatsApp, Facebook, and more</li>
          <li>✅ Uses NLP to understand and respond conversationally</li>
        </ul>
      </div>
      <ContinueButton onClick={nextStep} />
    </div>
  );
}

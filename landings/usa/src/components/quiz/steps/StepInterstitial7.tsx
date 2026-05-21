import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";

export default function StepInterstitial7() {
  const { nextStep } = useQuiz();
  return (
    <div className="text-center">
      <h2 className="text-[26px] font-extrabold mb-6" style={{ color: '#111' }}>AI Sales Agent</h2>
      <div className="mx-auto mb-6 w-[240px] rounded-[24px] overflow-hidden border-[3px] border-[#222]" style={{ background: '#F0EAFA' }}>
        <div className="px-3 py-2 flex items-center gap-2" style={{ background: '#7C3AED' }}>
          <div className="w-8 h-8 rounded-full" style={{ background: '#A78BFA' }} />
          <span className="text-white text-[13px] font-semibold">CloudSync</span>
        </div>
        <div className="px-3 py-3 space-y-2">
          <div className="bg-white rounded-lg px-3 py-2 text-[12px] text-left max-w-[85%]" style={{ color: '#111' }}>
            Hi! Looking to automate your sales? Tell me about your business 🚀
          </div>
          <div className="rounded-lg px-3 py-2 text-[12px] text-right ml-auto max-w-[85%]" style={{ background: '#E9D5FF', color: '#111' }}>
            We run a SaaS with 500 leads/month
          </div>
          <div className="bg-white rounded-lg px-3 py-2 text-[12px] text-left max-w-[85%]" style={{ color: '#111' }}>
            Great! I can qualify leads and book demos automatically. Want to see how?
          </div>
          <div className="flex gap-1 mt-1">
            {["Yes, show me", "Tell me more"].map((b) => (
              <span key={b} className="px-2 py-1 rounded-full text-[10px] font-medium" style={{ background: '#7C3AED', color: '#fff' }}>{b}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="text-left mx-auto" style={{ maxWidth: 400 }}>
        <p className="text-[18px] font-bold mb-3" style={{ color: '#111' }}>💰 Freelancer Cost: $2,000 – $10,000</p>
        <ul className="space-y-2 text-[14px] mb-6" style={{ color: '#444' }}>
          <li>✅ Automates lead generation</li>
          <li>✅ Qualifies leads using AI-driven conversations</li>
          <li>✅ Engages and nurtures leads through emails and messages</li>
          <li>✅ Integrates with CRM systems (Salesforce, HubSpot)</li>
        </ul>
      </div>
      <ContinueButton onClick={nextStep} />
    </div>
  );
}

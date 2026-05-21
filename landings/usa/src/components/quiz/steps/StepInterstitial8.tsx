import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";

export default function StepInterstitial8() {
  const { nextStep } = useQuiz();
  return (
    <div className="text-center">
      <h2 className="text-[26px] font-extrabold mb-6" style={{ color: '#111' }}>AI Marketing Agent</h2>
      <p className="text-[14px] mb-6" style={{ color: '#555' }}>Automated Social Media Posting</p>
      {/* Workflow card */}
      <div className="mx-auto mb-6 rounded-2xl p-5 w-full max-w-[340px]" style={{ background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)' }}>
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="px-2 py-1 rounded-lg text-[11px] font-bold" style={{ background: '#fff', color: '#111' }}>🔍 Google</span>
          <span style={{ color: '#059669' }}>→</span>
          <span className="px-2 py-1 rounded-lg text-[11px] font-bold" style={{ background: '#fff', color: '#111' }}>📝 Summarize</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span style={{ color: '#059669' }}>↓</span>
        </div>
        <div className="flex items-center justify-center gap-2 mt-2">
          {["X Thread", "IG Post", "FB Post"].map((p) => (
            <span key={p} className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: '#fff', color: '#111' }}>{p}</span>
          ))}
        </div>
      </div>
      <div className="text-left mx-auto" style={{ maxWidth: 400 }}>
        <p className="text-[18px] font-bold mb-3" style={{ color: '#111' }}>💰 Freelancer Cost: $3,000 – $12,000</p>
        <ul className="space-y-2 text-[14px] mb-6" style={{ color: '#444' }}>
          <li>✅ Automates social media posting & scheduling</li>
          <li>✅ Analyzes market trends and audience engagement</li>
          <li>✅ Creates AI-generated content (text, images, videos)</li>
          <li>✅ Runs AI-optimized ad campaigns</li>
        </ul>
      </div>
      <ContinueButton onClick={nextStep} />
    </div>
  );
}

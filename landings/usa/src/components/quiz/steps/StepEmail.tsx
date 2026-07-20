import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";
import { useState } from "react";
import { trackLead } from "@/lib/meta-pixel";
import { ga4GenerateLead } from "@/lib/ga4";
import { pushToDataLayer } from "@/lib/gtm";

export default function StepEmail() {
  const { answers, setAnswer, nextStep } = useQuiz();
  const [email, setEmail] = useState(answers.email || "");
  const [agreed, setAgreed] = useState(false);

  const handleContinue = () => {
    trackLead();
    ga4GenerateLead();
    pushToDataLayer("generate_lead");
    nextStep();
  };

  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-2 text-center" style={{ color: '#111' }}>
        Enter your email to get your personal{" "}
        <span style={{ color: '#F97316' }}>AI-Expert Plan</span>
      </h2>
      <div className="mt-8 mb-4">
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setAnswer("email", e.target.value); }}
          placeholder="email@gmail.com"
          className="w-full rounded-xl border px-5 py-4 text-[16px] outline-none"
          style={{ borderColor: '#E5E5E5', color: '#111' }}
        />
      </div>
      <label className="flex items-start gap-2 mb-8 cursor-pointer">
        <input type="checkbox" checked={agreed} onChange={() => setAgreed(!agreed)} className="mt-1" />
        <span className="text-[12px]" style={{ color: '#888' }}>I agree to receive latest Appex news and updates via email</span>
      </label>
      <ContinueButton onClick={handleContinue} disabled={!email || !email.includes("@")} />
    </div>
  );
}

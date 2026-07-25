import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";
import { useState } from "react";
import { trackCompleteRegistration } from "@/lib/meta-pixel";
import { ga4NameSubmit } from "@/lib/ga4";
import { pushToDataLayer } from "@/lib/gtm";

export default function StepName() {
  const { answers, setAnswer, commitAnswer, nextStep } = useQuiz();
  const [name, setName] = useState(answers.userName || "");

  const handleContinue = () => {
    // Commit once (setAnswer fires per keystroke); don't send the name itself.
    commitAnswer("userName", "provided");
    trackCompleteRegistration();
    ga4NameSubmit();
    pushToDataLayer("name_submit");
    nextStep();
  };

  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        What is your name?
      </h2>
      <input
        type="text"
        value={name}
        onChange={(e) => { setName(e.target.value); setAnswer("userName", e.target.value); }}
        placeholder="Name"
        className="w-full rounded-xl border px-5 py-4 text-[16px] outline-none mb-8"
        style={{ borderColor: '#E5E5E5', color: '#111' }}
      />
      <ContinueButton onClick={handleContinue} disabled={!name.trim()} />
    </div>
  );
}

import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";
import { useState } from "react";

export default function StepName() {
  const { answers, setAnswer, nextStep } = useQuiz();
  const [name, setName] = useState(answers.userName || "");

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
      <ContinueButton onClick={nextStep} disabled={!name.trim()} />
    </div>
  );
}

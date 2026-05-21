import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";
import { useState } from "react";

export default function StepPriceInput() {
  const { answers, setAnswer, nextStep } = useQuiz();
  const [value, setValue] = useState(answers.priceFeeling || "");

  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        At what price would a personal freelancing plan with 15+ free AI tools start to feel too expensive?
      </h2>
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center rounded-xl border px-5 py-4 w-full max-w-[280px]" style={{ borderColor: '#E5E5E5' }}>
          <span className="text-[24px] font-bold mr-3" style={{ color: '#888' }}>$</span>
          <input
            type="number"
            value={value}
            onChange={(e) => { setValue(e.target.value); setAnswer("priceFeeling", e.target.value); }}
            placeholder="50"
            className="text-[24px] font-bold w-full border-none outline-none bg-transparent text-center"
            style={{ color: '#111' }}
          />
        </div>
      </div>
      <ContinueButton onClick={nextStep} disabled={!value} />
    </div>
  );
}

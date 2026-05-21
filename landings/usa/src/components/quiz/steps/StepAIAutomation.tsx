import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = [
  { label: "Yes" },
  { label: "No, I want to know" },
];

export default function StepAIAutomation() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        Do you know how AI business automation works?
      </h2>
      {options.map((o) => (
        <OptionCard key={o.label} label={o.label} type="radio" selected={answers.aiAutomationKnowledge === o.label} onClick={() => { setAnswer("aiAutomationKnowledge", o.label); setTimeout(nextStep, 350); }} />
      ))}
    </div>
  );
}

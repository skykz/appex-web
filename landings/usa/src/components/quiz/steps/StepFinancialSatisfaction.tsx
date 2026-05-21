import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = [
  "I'm more than happy",
  "I'd like more stability",
  "I'm struggling financially",
  "I don't want to answer",
];

export default function StepFinancialSatisfaction() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        How satisfied are you with your current financial situation?
      </h2>
      {options.map((o) => (
        <OptionCard
          key={o}
          label={o}
          type="radio"
          selected={answers.financialSatisfaction === o}
          onClick={() => { setAnswer("financialSatisfaction", o); setTimeout(nextStep, 350); }}
        />
      ))}
    </div>
  );
}

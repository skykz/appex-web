import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = [
  "I'm always looking for new opportunities",
  "I've been thinking about it for a few months",
  "I've only started thinking about it recently",
  "I haven't thought about it, but it sounds interesting",
];

export default function StepExtraIncome() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        When did you start thinking about making extra income?
      </h2>
      {options.map((o) => (
        <OptionCard
          key={o}
          label={o}
          type="radio"
          selected={answers.extraIncomeThinking === o}
          onClick={() => { setAnswer("extraIncomeThinking", o); setTimeout(nextStep, 350); }}
        />
      ))}
    </div>
  );
}

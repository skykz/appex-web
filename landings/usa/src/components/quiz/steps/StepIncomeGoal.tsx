import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = [
  "$30,000–$50,000",
  "$50,000–$100,000",
  "$100,000 and more",
];

export default function StepIncomeGoal() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        How much money do you want to make a year?
      </h2>
      {options.map((o) => (
        <OptionCard
          key={o}
          label={o}
          type="radio"
          selected={answers.incomeGoal === o}
          onClick={() => { setAnswer("incomeGoal", o); setTimeout(nextStep, 350); }}
        />
      ))}
    </div>
  );
}

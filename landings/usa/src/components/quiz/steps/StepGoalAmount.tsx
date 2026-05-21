import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = [
  { label: "Up to $2,000" },
  { label: "$2,000–$5,000" },
  { label: "$5,000–$10,000" },
  { label: "More than $10,000" },
];

export default function StepGoalAmount() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        How much do you plan to make to achieve your goal?
      </h2>
      {options.map((o) => (
        <OptionCard key={o.label} label={o.label} type="radio" selected={answers.goalAmount === o.label} onClick={() => { setAnswer("goalAmount", o.label); setTimeout(nextStep, 350); }} />
      ))}
    </div>
  );
}

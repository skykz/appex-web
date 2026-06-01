import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = [
  { label: "Get out of debts", emoji: "💸" },
  { label: "Go on a vacation", emoji: "🏖️" },
  { label: "Have a perfect wedding", emoji: "💍" },
  { label: "Get a new car", emoji: "🚗" },
  { label: "Buy an apartment", emoji: "🏠" },
  { label: "Close student loan", emoji: "🎓" },
  { label: "Other", emoji: "✨" },
];

export default function StepReasonGoal() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        Do you have a specific reason for starting making money online?
      </h2>
      {options.map((o) => (
        <OptionCard key={o.label} label={o.label} emoji={o.emoji} type="radio" selected={answers.reasonForMoney === o.label} onClick={() => { setAnswer("reasonForMoney", o.label); setTimeout(nextStep, 350); }} />
      ))}
    </div>
  );
}

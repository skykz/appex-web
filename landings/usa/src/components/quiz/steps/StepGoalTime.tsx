import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = [
  { label: "15–20 minutes a day" },
  { label: "20–30 minutes a day" },
  { label: "30–60 minutes a day" },
  { label: "More than 60 minutes a day" },
];

export default function StepGoalTime() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        How much time do you want to dedicate to achieve your goal?
      </h2>
      {options.map((o) => (
        <OptionCard key={o.label} label={o.label} type="radio" selected={answers.goalTime === o.label} onClick={() => { setAnswer("goalTime", o.label); setTimeout(nextStep, 350); }} />
      ))}
    </div>
  );
}

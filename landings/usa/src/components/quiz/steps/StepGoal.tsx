import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = [
  { label: "Get a side-hustle and earn extra +1000$ a month" },
  { label: "Quit my 9-5 job and be my own boss" },
  { label: "Professional growth" },
  { label: "Financial freedom" },
  { label: "Travel the world" },
];

export default function StepGoal() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        What is your main goal?
      </h2>
      {options.map((o) => (
        <OptionCard key={o.label} label={o.label} type="radio" selected={answers.goal === o.label} onClick={() => { setAnswer("goal", o.label); setTimeout(nextStep, 350); }} />
      ))}
    </div>
  );
}

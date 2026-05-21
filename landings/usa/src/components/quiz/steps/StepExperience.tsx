import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = [
  { label: "Yes, but it didn't work out" },
  { label: "No, I don't know where to start" },
  { label: "I tried, but everything seemed too complicated" },
  { label: "Yes, and I still want to try" },
];

export default function StepExperience() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        Have you tried earning online before?
      </h2>
      {options.map((o) => (
        <OptionCard key={o.label} label={o.label} type="radio" selected={answers.experience === o.label} onClick={() => { setAnswer("experience", o.label); setTimeout(nextStep, 350); }} />
      ))}
    </div>
  );
}

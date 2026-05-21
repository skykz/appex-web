import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = [
  { label: "Full-time worker" },
  { label: "Business owner" },
  { label: "Service worker" },
  { label: "Freelancer" },
  { label: "Currently unemployed" },
];

export default function StepDescribe() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        Which one describes you best?
      </h2>
      {options.map((o) => (
        <OptionCard key={o.label} label={o.label} type="radio" selected={answers.describe === o.label} onClick={() => { setAnswer("describe", o.label); setTimeout(nextStep, 350); }} />
      ))}
    </div>
  );
}

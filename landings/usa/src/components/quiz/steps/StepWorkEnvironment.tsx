import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = [
  "Remote/flexible",
  "Creative and free",
  "Traditional office",
  "Fast-paced",
  "Other",
];

export default function StepWorkEnvironment() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        What type of work environment suits you best?
      </h2>
      {options.map((o) => (
        <OptionCard
          key={o}
          label={o}
          type="radio"
          selected={answers.workEnvironment === o}
          onClick={() => { setAnswer("workEnvironment", o); setTimeout(nextStep, 350); }}
        />
      ))}
    </div>
  );
}

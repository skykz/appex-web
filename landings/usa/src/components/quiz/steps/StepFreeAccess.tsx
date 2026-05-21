import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = [
  { label: "Yes, that sounds amazing!" },
  { label: "No, but I want to learn more!" },
];

export default function StepFreeAccess() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        Did you know that with Appex, you get free access to 15+ AI tools in one place?
      </h2>
      {options.map((o) => (
        <OptionCard key={o.label} label={o.label} type="radio" selected={answers.freeAccessKnowledge === o.label} onClick={() => { setAnswer("freeAccessKnowledge", o.label); setTimeout(nextStep, 350); }} />
      ))}
    </div>
  );
}

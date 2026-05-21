import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

export default function StepCoding() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        Do you have coding experience?
      </h2>
      {["Yes", "No"].map((o) => (
        <OptionCard key={o} label={o} type="radio" selected={answers.codingExperience === o} onClick={() => { setAnswer("codingExperience", o); setTimeout(nextStep, 350); }} />
      ))}
    </div>
  );
}

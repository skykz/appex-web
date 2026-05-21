import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = [
  { label: "Sounds exciting — I'm ready to learn!" },
  { label: "Not sure yet — I need more info" },
];

export default function StepTryTechSkill() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        Would you try an easy tech skill that can make you money fast?
      </h2>
      {options.map((o) => (
        <OptionCard key={o.label} label={o.label} type="radio" selected={answers.tryTechSkill === o.label} onClick={() => { setAnswer("tryTechSkill", o.label); setTimeout(nextStep, 350); }} />
      ))}
    </div>
  );
}

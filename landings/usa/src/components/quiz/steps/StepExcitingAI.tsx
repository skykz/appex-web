import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = [
  { label: "High earning potential" },
  { label: "Flexibility & remote work" },
  { label: "Automating work & scaling income" },
  { label: "Learning cutting-edge AI skills" },
];

export default function StepExcitingAI() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        What's the most exciting thing about AI freelancing for you?
      </h2>
      {options.map((o) => (
        <OptionCard key={o.label} label={o.label} type="radio" selected={answers.excitingAboutAI === o.label} onClick={() => { setAnswer("excitingAboutAI", o.label); setTimeout(nextStep, 350); }} />
      ))}
    </div>
  );
}

import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = [
  { label: "Yes, I'm an experienced freelancer" },
  { label: "No, I want to know" },
];

export default function StepFindingClients() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        Did you know what methods of finding clients there are?
      </h2>
      {options.map((o) => (
        <OptionCard key={o.label} label={o.label} type="radio" selected={answers.findingClients === o.label} onClick={() => { setAnswer("findingClients", o.label); setTimeout(nextStep, 350); }} />
      ))}
    </div>
  );
}

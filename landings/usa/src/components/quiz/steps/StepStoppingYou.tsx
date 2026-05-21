import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = [
  { label: "I'm afraid it's not for me" },
  { label: "It's hard to understand AI" },
  { label: "I think it's only for programmers" },
  { label: "I don't have time to learn" },
  { label: "It all seems too new and confusing" },
];

export default function StepStoppingYou() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        What's stopping you from trying AI to earn online?
      </h2>
      {options.map((o) => (
        <OptionCard key={o.label} label={o.label} type="radio" selected={answers.stoppingYou === o.label} onClick={() => { setAnswer("stoppingYou", o.label); setTimeout(nextStep, 350); }} />
      ))}
    </div>
  );
}

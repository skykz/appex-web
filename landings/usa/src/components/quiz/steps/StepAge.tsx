import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = ["18–24", "25–34", "35–44", "45+"];

export default function StepAge() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-1 text-center" style={{ color: '#111' }}>
        Let's create your personal AI income plan
      </h2>
      <p className="text-[15px] mb-8 text-center" style={{ color: '#888' }}>First, how old are you?</p>
      {options.map((o) => (
        <OptionCard key={o} label={o} selected={answers.age === o} type="radio" onClick={() => { setAnswer("age", o); setTimeout(nextStep, 350); }} />
      ))}
    </div>
  );
}

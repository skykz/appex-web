import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = [
  "Less than 4 hours",
  "4-6 hours",
  "6-8 hours",
  "More than 8 hours",
];

export default function StepCurrentHours() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        How many hours do you typically work each day?
      </h2>
      {options.map((o) => (
        <OptionCard
          key={o}
          label={o}
          type="radio"
          selected={answers.currentHours === o}
          onClick={() => { setAnswer("currentHours", o); setTimeout(nextStep, 350); }}
        />
      ))}
    </div>
  );
}

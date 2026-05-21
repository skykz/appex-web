import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = [
  "Less than 4 hours",
  "4-6 hours",
  "6-8 hours",
  "More than 8 hours",
];

export default function StepPreferredHours() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        How many hours do you prefer to work each day?
      </h2>

      {/* Dynamic badge showing current answer */}
      {answers.currentHours && (
        <div className="flex justify-center mb-6">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium"
            style={{ border: '1.5px solid #F59E0B', color: '#92400E', background: '#FFFBEB' }}
          >
            Currently: {answers.currentHours}
          </span>
        </div>
      )}

      {options.map((o) => (
        <OptionCard
          key={o}
          label={o}
          type="radio"
          selected={answers.preferredHours === o}
          onClick={() => { setAnswer("preferredHours", o); setTimeout(nextStep, 350); }}
        />
      ))}
    </div>
  );
}

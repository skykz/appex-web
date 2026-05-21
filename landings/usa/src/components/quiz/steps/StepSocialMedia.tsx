import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";

const options = [
  "0-1 hours",
  "1-3 hours",
  "3-5 hours",
  "More than 5 hours",
];

export default function StepSocialMedia() {
  const { answers, setAnswer, nextStep } = useQuiz();
  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-8 text-center" style={{ color: '#111' }}>
        How many hours do you spend on social media (TikTok, Instagram, YouTube) each day?
      </h2>
      {options.map((o) => (
        <OptionCard
          key={o}
          label={o}
          type="radio"
          selected={answers.socialMediaHours === o}
          onClick={() => { setAnswer("socialMediaHours", o); setTimeout(nextStep, 350); }}
        />
      ))}
    </div>
  );
}

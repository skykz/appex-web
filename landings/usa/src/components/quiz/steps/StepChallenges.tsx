import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";
import ContinueButton from "../ContinueButton";

const options = [
  { label: "Low salary" },
  { label: "Lack of free time" },
  { label: "Feeling stuck" },
  { label: "Poor work-life balance" },
  { label: "Burnout and too much stress" },
  { label: "Toxic work culture" },
  { label: "No recognition" },
];

export default function StepChallenges() {
  const { answers, setAnswer, nextStep } = useQuiz();
  const selected = answers.challenges || [];

  const toggle = (label: string) => {
    const next = selected.includes(label) ? selected.filter((s) => s !== label) : [...selected, label];
    setAnswer("challenges", next);
  };

  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-1 text-center" style={{ color: '#111' }}>
        What challenges are you facing in your current job?
      </h2>
      <p className="text-[14px] mb-6 text-center" style={{ color: '#888' }}>Choose all that apply</p>
      {options.map((o) => (
        <OptionCard key={o.label} label={o.label} type="checkbox" selected={selected.includes(o.label)} onClick={() => toggle(o.label)} />
      ))}
      <ContinueButton onClick={nextStep} disabled={selected.length === 0} />
    </div>
  );
}

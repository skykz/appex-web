import { useQuiz } from "@/contexts/QuizContext";
import OptionCard from "../OptionCard";
import ContinueButton from "../ContinueButton";

const tools = [
  { label: "ChatGPT", emoji: "🔵" },
  { label: "Claude", emoji: "✳️" },
  { label: "Gemini", emoji: "💠" },
  { label: "Midjourney", emoji: "⛵" },
  { label: "DALL·E", emoji: "🔵" },
  { label: "Runway", emoji: "🔴" },
  { label: "Eleven Labs", emoji: "⏸️" },
  { label: "No experience yet, but I'm excited to learn" },
];

export default function StepAIToolsFamiliar() {
  const { answers, setAnswer, nextStep } = useQuiz();
  const selected: string[] = answers.aiToolsFamiliar || [];

  const toggle = (label: string) => {
    if (label === "No experience yet, but I'm excited to learn") {
      setAnswer("aiToolsFamiliar", [label]);
      return;
    }
    const filtered = selected.filter((s) => s !== "No experience yet, but I'm excited to learn");
    setAnswer("aiToolsFamiliar", filtered.includes(label) ? filtered.filter((s) => s !== label) : [...filtered, label]);
  };

  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-2 text-center" style={{ color: '#111' }}>
        Which AI tools are you familiar with?
      </h2>
      <p className="text-center text-[14px] mb-6" style={{ color: '#888' }}>Choose all that apply</p>
      {tools.map((t) => (
        <OptionCard key={t.label} label={t.label} emoji={t.emoji} type="checkbox" selected={selected.includes(t.label)} onClick={() => toggle(t.label)} />
      ))}
      <div className="mt-4">
        <ContinueButton onClick={nextStep} disabled={selected.length === 0} />
      </div>
    </div>
  );
}

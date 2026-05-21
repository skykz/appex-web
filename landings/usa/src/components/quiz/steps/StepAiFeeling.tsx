import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";

export default function StepAiFeeling() {
  const { answers, setAnswer, nextStep } = useQuiz();
  const value = answers.aiFeeling || 0;

  return (
    <div>
      <h2 className="text-[26px] font-extrabold mb-6 text-center" style={{ color: '#111' }}>
        How true is this for you?
      </h2>

      <div className="mb-9 rounded-xl px-5 py-5" style={{ background: '#F7F7F7', border: '2px solid #E0E0E0' }}>
        <p className="text-[17px] italic leading-relaxed text-center" style={{ color: '#333' }}>
          "I like the idea of earning with AI, but I'm not sure I can actually do it."
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2 mb-3">
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              onClick={() => setAnswer("aiFeeling", n)}
              className="flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all duration-150 h-[68px]"
              style={{
                background: selected ? '#111' : '#F5F5F5',
                border: selected ? '2px solid #111' : '1px solid #E5E5E5',
              }}
            >
              <span className="text-[24px] font-semibold" style={{ color: selected ? '#FFF' : '#111' }}>{n}</span>
              {(n === 1 || n === 5) && (
                <span className="text-[10px] mt-1" style={{ color: selected ? 'rgba(255,255,255,0.7)' : '#888' }}>
                  {n === 1 ? "Not at all" : "Completely"}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {value > 0 && <ContinueButton onClick={nextStep} />}
    </div>
  );
}

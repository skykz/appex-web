import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";

function getTargetDate(goalTime: string) {
  const now = new Date();
  const weeksToAdd = goalTime?.includes("60") ? 8 : goalTime?.includes("30") ? 10 : 14;
  const target = new Date(now.getTime() + weeksToAdd * 7 * 24 * 60 * 60 * 1000);
  return target.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

const months = () => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return d.toLocaleDateString("en-US", { month: "short" });
  });
};

export default function StepGrowthChart() {
  const { answers, nextStep } = useQuiz();
  const targetDate = getTargetDate(answers.goalTime);
  const goalLabel = answers.reasonForMoney || "Your goal";
  const goalAmount = answers.goalAmount || "More than $10,000";
  const m = months();

  return (
    <div>
      <h2 className="text-[24px] font-extrabold mb-2 text-center" style={{ color: '#111' }}>
        Your Personal AI-Driven Income Growth Plan
      </h2>
      <p className="text-[14px] text-center mb-2" style={{ color: '#555' }}>
        We predict you'll have <strong>{goalAmount}</strong> by <strong>{targetDate}</strong>
      </p>
      <div className="flex items-center justify-center gap-2 mb-6">
        <span className="text-[12px]" style={{ color: '#555' }}>Your big goal:</span>
        <span className="px-3 py-1 rounded-full text-[12px] font-semibold border" style={{ borderColor: '#2563EB', color: '#2563EB' }}>{goalLabel}</span>
      </div>

      {/* Chart */}
      <div className="rounded-2xl border p-4 mb-6" style={{ borderColor: '#E5E5E5', background: '#FAFAFA' }}>
        <svg viewBox="0 0 340 180" className="w-full">
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="30%" stopColor="#F97316" />
              <stop offset="60%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
          </defs>
          {/* Grid */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line key={i} x1={40 + i * 56} y1="10" x2={40 + i * 56} y2="145" stroke="#F0F0F0" strokeWidth="0.5" />
          ))}
          {["$2K", "$5K", "$10K", "$15K", "$20K+"].map((l, i) => (
            <text key={l} x="4" y={140 - i * 30} fill="#AAA" fontSize="8">{l}</text>
          ))}
          {m.map((label, i) => (
            <text key={label} x={40 + i * 56} y="160" fill="#AAA" fontSize="8" textAnchor="middle">{label}</text>
          ))}
          {/* Curve */}
          <path d="M 40 140 Q 96 135 152 115 Q 208 75 264 40 Q 292 25 320 15" fill="none" stroke="url(#lineGrad)" strokeWidth="3" strokeLinecap="round" />
          {/* Goal line */}
          <line x1="230" y1="10" x2="230" y2="145" stroke="#111" strokeWidth="1" strokeDasharray="4 3" />
          <rect x="195" y="0" width="70" height="16" rx="4" fill="#111" />
          <text x="230" y="11" fill="#fff" fontSize="7" textAnchor="middle">Achieving your goal</text>
          {/* End label */}
          <rect x="290" y="8" width="48" height="14" rx="4" fill="#2563EB" />
          <text x="314" y="18" fill="#fff" fontSize="7" textAnchor="middle">Your Potential</text>
        </svg>
      </div>
      <ContinueButton onClick={nextStep} />
    </div>
  );
}

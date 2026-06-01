import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";

function getTargetDate(timeHorizon: string): { label: string; monthsOut: number } {
  if (timeHorizon === "In the next 30 days") return { label: formatDate(30), monthsOut: 1 };
  if (timeHorizon === "1–3 months") return { label: formatDate(60), monthsOut: 2 };
  if (timeHorizon === "3–6 months") return { label: formatDate(120), monthsOut: 4 };
  return { label: formatDate(90), monthsOut: 3 };
}

function formatDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

const MILESTONES = [
  "First Claude workflow",
  "3 workflows built",
  "Portfolio ready",
  "Certification earned",
  "Job-ready",
];

const monthLabels = () => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return d.toLocaleDateString("en-US", { month: "short" });
  });
};

export default function StepGrowthChart() {
  const { answers, nextStep } = useQuiz();
  const { label: targetDate, monthsOut } = getTargetDate(answers.time_horizon);
  const careerGoal = answers.career_goal || "Your goal";
  const m = monthLabels();

  // goal line x position based on time horizon (out of 6 months)
  const goalX = 40 + Math.min(monthsOut, 5) * 56;

  return (
    <div>
      <h2
        className="text-[22px] sm:text-[26px] font-extrabold mb-2 text-left leading-tight"
        style={{ color: '#111', WebkitTextFillColor: '#111' }}
      >
        Your Personal AI Skill Growth Plan
      </h2>
      <p className="text-[14px] text-left mb-3" style={{ color: '#555' }}>
        Based on your goal, you'll be job-ready with Claude by <strong>{targetDate}</strong>
      </p>
      <div className="flex items-center justify-start gap-2 mb-6 flex-wrap">
        <span className="text-[12px]" style={{ color: '#555' }}>Your big goal:</span>
        <span
          className="px-3 py-1 rounded-full text-[12px] font-semibold border"
          style={{ borderColor: '#F97316', color: '#F97316' }}
        >
          {careerGoal}
        </span>
      </div>

      {/* Chart */}
      <div
        className="rounded-2xl border p-3 sm:p-4 mb-6 overflow-hidden"
        style={{ borderColor: '#E5E5E5', background: '#FAFAFA' }}
      >
        <svg viewBox="0 0 340 185" preserveAspectRatio="xMidYMid meet" className="w-full h-auto block">
          <defs>
            <linearGradient id="growthGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="30%" stopColor="#F97316" />
              <stop offset="60%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {MILESTONES.map((_, i) => (
            <line
              key={i}
              x1="92" y1={140 - i * 27}
              x2="328" y2={140 - i * 27}
              stroke="#F0F0F0" strokeWidth="0.8"
            />
          ))}

          {/* Y-axis milestone labels */}
          {MILESTONES.map((label, i) => (
            <text key={label} x="88" y={143 - i * 27} fill="#AAA" fontSize="7.5" textAnchor="end">
              {label}
            </text>
          ))}

          {/* X-axis month labels */}
          {m.map((label, i) => (
            <text
              key={label}
              x={40 + i * 56}
              y="178"
              fill="#AAA"
              fontSize="8"
              textAnchor="middle"
            >
              {label}
            </text>
          ))}

          {/* Vertical grid lines */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line
              key={i}
              x1={40 + i * 56} y1="10"
              x2={40 + i * 56} y2="148"
              stroke="#F0F0F0" strokeWidth="0.5"
            />
          ))}

          {/* Growth curve */}
          <path
            d="M 40 140 Q 96 135 152 115 Q 208 75 264 40 Q 292 25 320 15"
            fill="none"
            stroke="url(#growthGrad)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Goal dashed line */}
          <line
            x1={goalX} y1="10"
            x2={goalX} y2="148"
            stroke="#111" strokeWidth="1" strokeDasharray="4 3"
          />
          <rect x={goalX - 38} y="0" width="76" height="16" rx="4" fill="#111" />
          <text x={goalX} y="11" fill="#fff" fontSize="7" textAnchor="middle">
            Achieving your goal
          </text>

          {/* Your Potential label */}
          <rect x="276" y="8" width="52" height="14" rx="4" fill="#F97316" />
          <text x="302" y="18" fill="#fff" fontSize="7" textAnchor="middle">Your Potential</text>
        </svg>
      </div>

      <ContinueButton onClick={nextStep} label="Continue →" />
    </div>
  );
}

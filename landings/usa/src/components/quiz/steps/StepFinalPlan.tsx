import { useQuiz } from "@/contexts/QuizContext";
import { useNavigate } from "react-router-dom";
import ContinueButton from "../ContinueButton";

export default function StepFinalPlan() {
  const { answers } = useQuiz();
  const navigate = useNavigate();
  const name = answers.userName || "Friend";

  return (
    <div className="text-center">
      <h2 className="text-[26px] font-extrabold mb-8" style={{ color: '#111' }}>
        {name}, your 4-week plan is ready
      </h2>
      {/* S-Curve chart */}
      <div className="mx-auto mb-8 rounded-2xl border p-5" style={{ maxWidth: 400, borderColor: '#E5E5E5', background: '#FAFAFA' }}>
        <svg viewBox="0 0 300 160" className="w-full">
          {/* Grid dots */}
          {Array.from({ length: 5 }).map((_, row) =>
            Array.from({ length: 5 }).map((_, col) => (
              <circle key={`${row}-${col}`} cx={40 + col * 60} cy={20 + row * 30} r="1" fill="#E0E0E0" />
            ))
          )}
          {/* S-curve */}
          <path d="M 40 130 C 80 130 100 125 140 100 C 180 75 200 30 260 25" fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" />
          {/* Start dot */}
          <circle cx="40" cy="130" r="5" fill="#2563EB" />
          {/* End dot */}
          <circle cx="260" cy="25" r="5" fill="#2563EB" />
          {/* NOW label */}
          <rect x="15" y="138" width="50" height="18" rx="9" fill="#2563EB" />
          <text x="40" y="150" fill="white" fontSize="8" textAnchor="middle" fontWeight="bold">NOW</text>
          {/* AFTER label */}
          <rect x="200" y="5" width="100" height="18" rx="9" fill="#2563EB" />
          <text x="250" y="17" fill="white" fontSize="7" textAnchor="middle" fontWeight="bold">AFTER 4 WEEKS</text>
          {/* Week labels */}
          {["WEEK 1", "WEEK 2", "WEEK 3", "WEEK 4"].map((w, i) => (
            <text key={w} x={40 + i * 73} y="158" fill="#AAA" fontSize="7" textAnchor="middle">{w}</text>
          ))}
        </svg>
      </div>
      <ContinueButton onClick={() => navigate("/paywall")} label="Continue →" />
    </div>
  );
}

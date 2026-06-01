import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";

function getSkillValues(answers: any) {
  const mindset = answers.frustration >= 4 ? "High" : answers.frustration >= 2 ? "Moderate" : "Low";
  const coding = answers.codingExperience === "Yes" ? "Present" : "Absent";
  const freelancing = answers.findingClients?.includes("experienced") ? "Advanced" : "Sufficient";
  const aiAwareness = (answers.aiToolsFamiliar?.length || 0) >= 3 ? "High" : (answers.aiToolsFamiliar?.length || 0) >= 1 ? "Sufficient" : "Basic";
  return { mindset, coding, freelancing, aiAwareness };
}

export default function StepIncomeProfile() {
  const { answers, nextStep } = useQuiz();
  const skills = getSkillValues(answers);
  const score = 65;

  return (
    <div>
      <h2
        className="text-[24px] sm:text-[28px] font-extrabold mb-2 text-left leading-tight"
        style={{ color: '#111', WebkitTextFillColor: '#111', textDecoration: 'none' }}
      >
        Here's your AI profile
      </h2>
      <p
        className="text-[14px] sm:text-[15px] mb-6 text-left"
        style={{ color: '#6B7280', WebkitTextFillColor: '#6B7280' }}
      >
        Based on your answers, we've created your personal AI readiness assessment.
      </p>

      <div className="rounded-2xl border p-5 mb-6" style={{ borderColor: '#E5E5E5', background: '#FAFAFA' }}>
        <p className="text-[13px] font-semibold mb-5" style={{ color: '#555' }}>AI-Expert potential score</p>

        {/* Score bar */}
        <div className="relative mt-6 mb-2">
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'linear-gradient(to right, #EF4444, #EAB308, #22C55E)' }} />
          <div className="absolute top-[-24px]" style={{ left: `${score}%`, transform: 'translateX(-50%)' }}>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: '#111', color: '#fff' }}>
              Your potential — {score}
            </span>
          </div>
        </div>
        <div className="flex justify-between text-[10px] mb-5" style={{ color: '#888' }}>
          <span>Low</span><span>Intermediate</span><span>High</span>
        </div>

        {/* Insight callout — orange accent */}
        <div
          className="rounded-xl px-4 py-3 mb-5 border-l-4"
          style={{ background: '#FFF7ED', borderColor: '#F97316' }}
        >
          <p className="text-[13px]" style={{ color: '#333' }}>
            You have a strong foundation to build real AI skills. Your plan will take you from beginner to confident Claude user — fast.
          </p>
        </div>

        {/* Skills */}
        <div className="space-y-3">
          {[
            { icon: "⭐", label: "Mindset match", value: skills.mindset },
            { icon: "</>", label: "Coding Skills", value: skills.coding },
            { icon: "💻", label: "Freelancing Skills", value: skills.freelancing },
            { icon: "🤖", label: "AI Awareness", value: skills.aiAwareness },
          ].map((s) => (
            <div key={s.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[16px]">{s.icon}</span>
                <span className="text-[14px]" style={{ color: '#333' }}>{s.label}</span>
              </div>
              <span
                className="text-[13px] font-semibold px-3 py-1 rounded-full"
                style={{
                  background: s.value === "High" || s.value === "Present" || s.value === "Advanced" ? '#D1FAE5'
                    : s.value === "Absent" || s.value === "Low" || s.value === "Basic" ? '#FEE2E2'
                    : '#FEF3C7',
                  color: s.value === "High" || s.value === "Present" || s.value === "Advanced" ? '#059669'
                    : s.value === "Absent" || s.value === "Low" || s.value === "Basic" ? '#DC2626'
                    : '#D97706',
                }}
              >
                {s.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <ContinueButton onClick={nextStep} />
    </div>
  );
}

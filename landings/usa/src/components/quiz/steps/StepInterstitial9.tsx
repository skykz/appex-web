import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";

export default function StepInterstitial9() {
  const { nextStep } = useQuiz();
  return (
    <div className="text-center">
      <h2 className="text-[26px] font-extrabold mb-6" style={{ color: '#111' }}>AI-Based Resume Screening for HR</h2>
      {/* Resume score card */}
      <div className="mx-auto mb-6 rounded-2xl p-5 w-full max-w-[340px]" style={{ background: 'linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)' }}>
        <p className="text-[14px] font-bold mb-1" style={{ color: '#111' }}>Sarah Johnson</p>
        <p className="text-[12px] mb-4" style={{ color: '#555' }}>Junior Java Developer</p>
        {[
          { skill: "Java Experience", score: 90, color: "#22C55E" },
          { skill: "API Development", score: 75, color: "#EAB308" },
          { skill: "Team Collaboration", score: 80, color: "#22C55E" },
          { skill: "Cultural Fit", score: 70, color: "#EAB308" },
        ].map((s) => (
          <div key={s.skill} className="mb-2">
            <div className="flex justify-between text-[11px] mb-1" style={{ color: '#333' }}>
              <span>{s.skill}</span>
              <span className="font-bold">{s.score}</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: '#fff' }}>
              <div className="h-full rounded-full" style={{ width: `${s.score}%`, background: s.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="text-left mx-auto" style={{ maxWidth: 400 }}>
        <p className="text-[18px] font-bold mb-3" style={{ color: '#111' }}>💰 Freelancer Cost: $2,500 – $8,000</p>
        <ul className="space-y-2 text-[14px] mb-6" style={{ color: '#444' }}>
          <li>✅ Scans and ranks resumes based on job descriptions</li>
          <li>✅ Uses NLP to match skills and experience</li>
          <li>✅ Filters out irrelevant applications</li>
          <li>✅ Reduces HR workload by up to 70%</li>
        </ul>
      </div>
      <ContinueButton onClick={nextStep} />
    </div>
  );
}

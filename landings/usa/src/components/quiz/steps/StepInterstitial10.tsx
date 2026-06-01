import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";

export default function StepInterstitial10() {
  const { nextStep } = useQuiz();
  return (
    <div className="text-center">
      <h2 className="text-[26px] font-extrabold mb-6" style={{ color: '#111' }}>83.3% Success Rate</h2>
      {/* Chart card */}
      <div className="mx-auto mb-6 rounded-2xl p-5 w-full max-w-[380px] border" style={{ borderColor: '#E5E5E5', background: '#FAFAFA' }}>
        <p className="text-[13px] font-semibold mb-4 text-left" style={{ color: '#555' }}>Chance of success</p>
        <div className="relative h-[160px] mb-2">
          <svg viewBox="0 0 300 140" className="w-full h-full">
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((v) => (
              <line key={v} x1="30" y1={120 - v * 1.1} x2="290" y2={120 - v * 1.1} stroke="#E5E5E5" strokeWidth="0.5" />
            ))}
            {/* Appex User line */}
            <path d="M 30 110 Q 100 100 160 70 Q 220 30 290 15" fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" />
            {/* Average user line */}
            <path d="M 30 110 Q 100 105 160 100 Q 220 95 290 90" fill="none" stroke="#CCC" strokeWidth="2" strokeDasharray="4 4" />
            {/* Labels */}
            <text x="30" y="135" fill="#888" fontSize="9">Today</text>
            <text x="255" y="135" fill="#888" fontSize="9">in 1 month</text>
            <text x="8" y="14" fill="#888" fontSize="8">100%</text>
            <text x="16" y="68" fill="#888" fontSize="8">50%</text>
            <text x="20" y="122" fill="#888" fontSize="8">0</text>
          </svg>
          {/* Legend */}
          <div className="flex justify-center gap-4 mt-1">
            <div className="flex items-center gap-1">
              <div className="w-3 h-[2px] rounded" style={{ background: '#F97316' }} />
              <span className="text-[10px]" style={{ color: '#F97316' }}>Appex User</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-[2px] rounded" style={{ background: '#CCC' }} />
              <span className="text-[10px]" style={{ color: '#999' }}>Average user</span>
            </div>
          </div>
        </div>
      </div>
      <p className="text-[14px] text-left mx-auto mb-6" style={{ maxWidth: 380, color: '#444' }}>
        We will show you all the methods of finding clients and consider all channels, so you will definitely find your client. <strong>83.3% of our students find their first client within 1 month.</strong>
      </p>
      <ContinueButton onClick={nextStep} />
    </div>
  );
}

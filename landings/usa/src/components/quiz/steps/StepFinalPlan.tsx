import { useNavigate } from "react-router-dom";
import ContinueButton from "../ContinueButton";

const weeks = [
  { label: "Week 1", text: "Claude Fundamentals — learn how to communicate with AI and get useful, accurate results" },
  { label: "Week 2", text: "Claude Code Basics — let Claude handle tasks on your computer and automate simple workflows" },
  { label: "Week 3", text: "Building with Claude — create simple tools, pages, and solutions without coding" },
  { label: "Week 4", text: "Real Projects & Automation — apply Claude to real tasks and build things you can actually use" },
];

const bullets = [
  "100,000+ students already enrolled",
  "Recognized credential for your resume and LinkedIn",
  "Validates real, practical AI skills — not just theory",
  "Complete in 4 weeks — 15 minutes per day",
];

export default function StepFinalPlan() {
  const navigate = useNavigate();

  return (
    <div>
      <h2 className="text-[28px] font-extrabold mb-6 leading-tight" style={{ color: '#111' }}>
        Your Personal Plan to Master Claude
      </h2>

      <div className="rounded-2xl px-5 py-4 mb-6 text-center text-white text-[15px] font-medium" style={{ background: '#111' }}>
        AI-skilled professionals earn 25-50% more. You're about to become one of them.
      </div>

      <div className="rounded-2xl p-5 mb-6" style={{ background: '#FFF7ED' }}>
        <h3 className="text-[18px] font-bold mb-1" style={{ color: '#111' }}>Become the Master of Claude</h3>
        <p className="text-[14px] mb-4" style={{ color: '#555' }}>4-week guided course + official certification</p>
        <div className="flex flex-col">
          {weeks.map((w, i) => (
            <div
              key={w.label}
              className="flex gap-4 py-3"
              style={{ borderTop: i === 0 ? 'none' : '1px solid #D9DEF7' }}
            >
              <div className="text-[14px] font-semibold shrink-0 w-[64px]" style={{ color: '#F97316' }}>{w.label}</div>
              <div className="text-[14px] leading-snug" style={{ color: '#111' }}>{w.text}</div>
            </div>
          ))}
          <div className="flex gap-3 pt-3" style={{ borderTop: '1px solid #D9DEF7' }}>
            <span className="text-[18px]">🎓</span>
            <div className="text-[14px] leading-snug" style={{ color: '#111' }}>
              Certification exam — prove your skills, get certified
            </div>
          </div>
        </div>
      </div>

      <ul className="flex flex-col gap-3 mb-8">
        {bullets.map((b) => (
          <li key={b} className="flex gap-3 items-start text-[15px]" style={{ color: '#111' }}>
            <span className="text-[16px] font-bold" style={{ color: '#16A34A' }}>✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <ContinueButton onClick={() => navigate("/paywall")} label="Continue" />
    </div>
  );
}

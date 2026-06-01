import { useQuiz } from "@/contexts/QuizContext";
import { useState, useEffect, useRef } from "react";

const STAGES = [
  {
    label: "Setting goals",
    question: "Are you ready to finally take control of your career?",
  },
  {
    label: "Setting growth areas",
    question: "Would you commit 15 min/day to learn a high-income skill?",
  },
  {
    label: "Building your roadmap",
    question: "Do you want us to help you build your first Claude project?",
  },
];

const REVIEWS = [
  {
    name: "Emma R.",
    loc: "UK",
    stars: 5,
    title: "Didn't expect much… but it actually works!",
    body: "I set up my first Claude workflow in 3 days. Landed my first client the same week. Genuinely surprised.",
  },
  {
    name: "Carlos M.",
    loc: "California, USA",
    stars: 5,
    title: "Side hustle turned full-time income",
    body: "Started just for extra income — now I'm building AI workflows for local businesses. The plan is super clear.",
  },
  {
    name: "Sarah T.",
    loc: "Australia",
    stars: 5,
    title: "Zero coding. Real results.",
    body: "I have zero tech background. Appex made it easy to build things I can actually sell to clients.",
  },
  {
    name: "James K.",
    loc: "Canada",
    stars: 5,
    title: "Got promoted after 4 weeks",
    body: "Used the Claude skills at work and my manager noticed immediately. Promoted within a month.",
  },
];

export default function StepLoading() {
  const { nextStep } = useQuiz();
  const [stage, setStage] = useState(0);     // 0, 1, 2
  const [pct, setPct] = useState(0);
  const [popupVisible, setPopupVisible] = useState(false);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [reviewExiting, setReviewExiting] = useState(false);
  const rafRef = useRef<number | null>(null);

  // Run progress bar for current stage
  useEffect(() => {
    setPct(0);
    setPopupVisible(false);
    const start = performance.now();
    const duration = 2000;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 2);
      const next = Math.round(eased * 100);
      setPct(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setPopupVisible(true);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [stage]);

  // Auto-rotate reviews with slide-left animation
  useEffect(() => {
    const id = setInterval(() => {
      setReviewExiting(true);
      setTimeout(() => {
        setReviewIdx((i) => (i + 1) % REVIEWS.length);
        setReviewExiting(false);
      }, 320);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const handleAnswer = () => {
    setPopupVisible(false);
    setTimeout(() => {
      if (stage < STAGES.length - 1) setStage((s) => s + 1);
      else nextStep();
    }, 200);
  };

  const review = REVIEWS[reviewIdx];

  return (
    <div className="relative">

      {/* 3 progress blocks */}
      <div className="flex flex-col gap-3 mb-6">
        {STAGES.map((s, i) => {
          const isDone = i < stage;
          const isActive = i === stage;
          const isPending = i > stage;
          return (
            <div
              key={s.label}
              className="rounded-xl border px-4 py-3 transition-all duration-300"
              style={{
                borderColor: isDone ? '#111' : isActive ? '#E5E5E5' : '#E5E5E5',
                background: isDone ? '#111' : '#fff',
                opacity: isPending ? 0.45 : 1,
              }}
            >
              {isDone ? (
                <div className="flex items-center gap-3">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] flex-shrink-0"
                    style={{ background: '#fff', color: '#111' }}
                  >
                    ✓
                  </span>
                  <span className="text-[14px] font-semibold" style={{ color: '#fff' }}>{s.label}</span>
                </div>
              ) : isActive ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-medium" style={{ color: '#111' }}>{s.label}</p>
                    <p className="text-[13px] font-semibold tabular-nums" style={{ color: '#111' }}>{pct}%</p>
                  </div>
                  <div className="h-[6px] rounded-full overflow-hidden" style={{ background: '#E5E5E5' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: '#F97316', transition: 'width 80ms linear' }}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-[13px] font-medium" style={{ color: '#9CA3AF' }}>{s.label}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Dimmed overlay + popup */}
      {popupVisible && (
        <div
          className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          <div
            className="w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-xl"
            style={{ animation: 'slideUpFade 0.25s ease' }}
          >
            <h3 className="text-[20px] font-bold mb-2 text-center" style={{ color: '#111' }}>
              {STAGES[stage].question}
            </h3>
            <p className="text-[13px] text-center mb-6" style={{ color: '#9CA3AF' }}>
              To move forward, please specify
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleAnswer}
                className="flex-1 py-3 rounded-full border text-[15px] font-semibold cursor-pointer"
                style={{ borderColor: '#E5E5E5', background: '#fff', color: '#111' }}
              >
                No
              </button>
              <button
                onClick={handleAnswer}
                className="flex-1 py-3 rounded-full border-none text-[15px] font-semibold cursor-pointer text-white"
                style={{ background: '#111' }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-sliding review card */}
      <div className="overflow-hidden rounded-xl border" style={{ borderColor: '#E5E5E5' }}>
        <div
          className="p-4 transition-all"
          style={{
            transform: reviewExiting ? 'translateX(-40px)' : 'translateX(0)',
            opacity: reviewExiting ? 0 : 1,
            transition: 'transform 320ms ease, opacity 320ms ease',
          }}
        >
          <div className="flex gap-0.5 mb-1">
            {Array.from({ length: review.stars }).map((_, i) => (
              <span key={i} className="text-[14px]" style={{ color: '#F59E0B' }}>★</span>
            ))}
          </div>
          <p className="text-[12px] mb-1" style={{ color: '#9CA3AF' }}>
            {review.name} | {review.loc}
          </p>
          <p className="text-[14px] font-semibold mb-1" style={{ color: '#111' }}>{review.title}</p>
          <p className="text-[13px]" style={{ color: '#555' }}>{review.body}</p>
        </div>
      </div>

      <style>{`
        @keyframes slideUpFade {
          from { transform: translateY(24px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

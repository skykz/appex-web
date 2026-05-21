import { useQuiz } from "@/contexts/QuizContext";
import { useState } from "react";

const stages = [
  {
    progress: "Setting Goals — 50%",
    completedItems: [] as string[],
    question: "Are you ready to finally take control of your income?",
    review: { name: "Sarah Mitchell", loc: "US", date: "13 June 2025", title: "Impressive Learning", body: "Learning to build AI chatbots with Appex was way easier than I expected. I set up my first bot in 3 days and landed my first $500 client the same week!" },
  },
  {
    progress: "Setting Growth Areas — 50%",
    completedItems: ["Goals"],
    question: "Would you commit 30 min/day to learn a high-income skill?",
    review: { name: "Emily Davis", loc: "US", date: "4 April 2025", title: "Best AI course", body: "I had zero tech background, but the way Appex teaches AI automation is so clear and hands-on. Building and selling chatbots became a real skill for me — and actually profitable." },
  },
  {
    progress: "Picking content — 50%",
    completedItems: ["Goals", "Growth Areas"],
    question: "Do you want us to help you build your first paid AI project?",
    review: { name: "Emily Davis", loc: "US", date: "4 April 2025", title: "Best AI course", body: "I had zero tech background, but the way Appex teaches AI automation is so clear and hands-on. Building and selling chatbots became a real skill for me — and actually profitable." },
  },
];

export default function StepLoading() {
  const { nextStep } = useQuiz();
  const [stage, setStage] = useState(0);
  const current = stages[stage];

  const handleYes = () => {
    if (stage < 2) setStage(stage + 1);
    else nextStep();
  };

  return (
    <div>
      {/* Completed items */}
      {current.completedItems.map((item) => (
        <div key={item} className="flex items-center gap-2 rounded-xl border px-4 py-3 mb-3" style={{ borderColor: '#2563EB', background: '#EFF6FF' }}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[11px]" style={{ background: '#2563EB' }}>✓</span>
          <span className="text-[14px] font-medium" style={{ color: '#111' }}>{item}</span>
        </div>
      ))}

      {/* Progress bar */}
      <div className="rounded-xl border px-4 py-3 mb-6" style={{ borderColor: '#E5E5E5' }}>
        <p className="text-[13px] mb-2" style={{ color: '#555' }}>{current.progress}</p>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: '#E5E5E5' }}>
          <div className="h-full rounded-full" style={{ width: '50%', background: '#2563EB' }} />
        </div>
      </div>

      {/* Modal */}
      <div className="rounded-2xl border p-6 mb-6 text-center" style={{ borderColor: '#E5E5E5', background: '#fff' }}>
        <h3 className="text-[20px] font-bold mb-2" style={{ color: '#111' }}>{current.question}</h3>
        <p className="text-[13px] mb-5" style={{ color: '#888' }}>To move forward, please specify</p>
        <div className="flex gap-3 justify-center">
          <button onClick={handleYes} className="px-8 py-3 rounded-xl border text-[14px] font-semibold cursor-pointer" style={{ borderColor: '#E5E5E5', background: '#fff', color: '#111' }}>No</button>
          <button onClick={handleYes} className="px-8 py-3 rounded-xl border-none text-[14px] font-semibold cursor-pointer text-white" style={{ background: '#111' }}>Yes</button>
        </div>
      </div>

      {/* Review card */}
      <div className="rounded-xl border p-4" style={{ borderColor: '#E5E5E5' }}>
        <div className="flex gap-0.5 mb-1">
          {[1, 2, 3, 4, 5].map((i) => <span key={i} className="text-[14px]" style={{ color: '#F59E0B' }}>★</span>)}
        </div>
        <p className="text-[12px] mb-1" style={{ color: '#888' }}>{current.review.name} | {current.review.loc} — {current.review.date}</p>
        <p className="text-[14px] font-semibold mb-1" style={{ color: '#111' }}>{current.review.title}</p>
        <p className="text-[13px]" style={{ color: '#555' }}>{current.review.body}</p>
      </div>
    </div>
  );
}

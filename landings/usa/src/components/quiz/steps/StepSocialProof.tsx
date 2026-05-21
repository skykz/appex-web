import { useQuiz } from "@/contexts/QuizContext";
import { useNavigate } from "react-router-dom";
import ContinueButton from "../ContinueButton";

const reviews = [
  {
    name: "Lina K.",
    location: "NY, USA",
    date: "March 13, 2025",
    title: "Great support, real results",
    body: "Their team helped me get started with AI customer bots on WhatsApp and email. I've made $2,300 so far.",
  },
  {
    name: "Emma R.",
    location: "UK",
    date: "June 3, 2025",
    title: "Didn't expect much... but it actually works!",
    body: "I've done online courses before, but this one really delivered. I built a WhatsApp chatbot for a local store and made $750. Their tools and training made it way easier than I expected.",
  },
  {
    name: "Carlos M.",
    location: "California, USA",
    date: "28 April, 2025",
    title: "Side hustle turned full-time income",
    body: "Started just for extra income—now I'm building AI sales agents for Instagram shops. The freelance plan is super clear and helped me go full-time in 2 months.",
  },
];

export default function StepSocialProof() {
  const { nextStep } = useQuiz();
  const navigate = useNavigate();

  return (
    <div>
      {/* Trust stats */}
      <div className="rounded-xl px-5 py-5 mb-6 text-center" style={{ background: '#F7F7F7', border: '1px solid #E5E5E5' }}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-[20px]">🏆</span>
          <span className="text-[16px] font-bold" style={{ color: '#111' }}>120K+ users</span>
          <span className="text-[14px]" style={{ color: '#666' }}>have started their AI career with us</span>
        </div>
        <div className="flex items-center justify-center gap-2 mt-2">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="text-[14px]" style={{ color: '#00B67A' }}>★</span>
            ))}
          </div>
          <span className="text-[14px] font-semibold" style={{ color: '#111' }}>4.5</span>
          <span className="text-[13px]" style={{ color: '#888' }}>· 3,500+ reviews</span>
        </div>
      </div>

      {/* Reviews */}
      <div className="flex flex-col gap-4 mb-8">
        {reviews.map((r) => (
          <div key={r.name} className="rounded-xl px-5 py-4" style={{ background: '#FFFFFF', border: '1px solid #E5E5E5' }}>
            <div className="flex gap-0.5 mb-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="text-[12px]" style={{ color: '#00B67A' }}>★</span>
              ))}
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[13px] font-semibold" style={{ color: '#111' }}>{r.name}</span>
              <span className="text-[12px]" style={{ color: '#AAA' }}>{r.location} · {r.date}</span>
            </div>
            <p className="text-[15px] font-bold mb-1" style={{ color: '#111' }}>{r.title}</p>
            <p className="text-[14px] leading-relaxed" style={{ color: '#555' }}>{r.body}</p>
          </div>
        ))}
      </div>

      <ContinueButton onClick={nextStep} label="Continue →" />
    </div>
  );
}

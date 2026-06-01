import { useState } from "react";
import { QuizProvider, useQuiz } from "@/contexts/QuizContext";
import QuizFlow from "@/components/quiz/QuizFlow";
import maleImg from "@/assets/quiz-male.jpg";
import femaleImg from "@/assets/quiz-female.jpg";

function SideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-[200]" onClick={onClose} />
      )}
      <div
        className="fixed top-0 right-0 h-full z-[201] transition-transform duration-300 w-[280px] bg-card border-l border-border"
        style={{
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center border border-border rounded-md text-foreground text-xl bg-transparent cursor-pointer"
        >
          ✕
        </button>
        <div className="flex flex-col gap-1 pt-20 px-6">
          {[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Money-back Policy", href: "mailto:support@appex.me" },
              { label: "Subscription Privacy", href: "/subscription" },
              { label: "I already have an account", href: "/login" },
            ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-foreground text-[16px] py-3 hover:text-primary transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}


/* ── Intro splash screen ── */
function IntroScreen({ onStart }: { onStart: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFFFFF' }}>
      {/* Top bar */}
      <div className="relative flex items-center justify-center px-5 py-5">
        <a href="/" className="flex items-center select-none no-underline" aria-label="Appex">
          <span className="font-extrabold text-[22px] tracking-tight" style={{ color: '#111' }}>App</span>
          <span className="font-extrabold text-[22px] tracking-tight" style={{ color: '#F97316' }}>ex</span>
        </a>
        <button
          onClick={() => setMenuOpen(true)}
          className="absolute right-5 top-1/2 -translate-y-1/2 text-2xl bg-transparent border-none cursor-pointer p-2"
          style={{ color: '#111' }}
          aria-label="Open menu"
        >
          ☰
        </button>
      </div>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex-1 flex flex-col items-center justify-start px-5 pb-10 pt-2 overflow-y-auto">
        {/* Hero illustration */}
        <div className="relative mx-auto mb-6 rounded-3xl flex items-center justify-center overflow-hidden" style={{ background: '#FFF7ED', width: '100%', maxWidth: 240, height: 200 }}>
          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-14 h-14 rounded-xl bg-white/80 flex items-center justify-center text-[22px] shadow-sm">⛵</div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-14 h-14 rounded-xl bg-white/80 flex items-center justify-center text-[22px] shadow-sm">🐋</div>
          <span className="absolute top-6 left-16 text-[18px]">✦</span>
          <span className="absolute bottom-6 right-16 text-[18px]">✦</span>

          <div className="relative w-[55%] aspect-square rounded-2xl flex items-center justify-center shadow-xl" style={{ background: 'linear-gradient(180deg, #F97316 0%, #E85D2A 100%)' }}>
            <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-white flex items-center justify-center text-[20px] shadow-md">💡</div>
            <svg viewBox="0 0 100 100" className="w-3/5 h-3/5" fill="white" aria-hidden>
              {Array.from({ length: 12 }).map((_, i) => {
                const a = (i * Math.PI * 2) / 12;
                const x1 = 50 + Math.cos(a) * 12;
                const y1 = 50 + Math.sin(a) * 12;
                const x2 = 50 + Math.cos(a) * 42;
                const y2 = 50 + Math.sin(a) * 42;
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth="7" strokeLinecap="round" />;
              })}
              <circle cx="50" cy="50" r="6" />
            </svg>
          </div>
        </div>

        <h1 className="text-[28px] md:text-[36px] font-extrabold leading-tight mb-3 text-center max-w-[520px]" style={{ color: '#111' }}>
          Become the Certified Master of Claude
        </h1>
        <p className="text-[16px] md:text-[17px] mb-8 text-center" style={{ color: '#475569' }}>
          Have you ever used Claude?
        </p>

        <div className="w-full max-w-[520px] grid grid-cols-2 gap-3 mb-8">
          {(["Yes", "No"] as const).map((label) => (
            <button
              key={label}
              onClick={onStart}
              className="rounded-2xl py-4 text-white font-bold text-[16px] flex items-center justify-center gap-2 border-none cursor-pointer transition-transform hover:scale-[1.02]"
              style={{ background: '#111' }}
            >
              {label}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ))}
        </div>

        <p className="text-[12px] text-center max-w-[520px]" style={{ color: '#94A3B8' }}>
          By proceeding, you agree with{" "}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#F97316' }}>Terms and Conditions</a>,{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#F97316' }}>Privacy Policy</a>,{" "}
          <a href="/subscription" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#F97316' }}>Subscription Terms</a>
        </p>

      </div>
    </div>
  );
}

function GenderScreen() {
  const { setAnswer, goToStep } = useQuiz();
  const [selected, setSelected] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSelect = (gender: string) => {
    setSelected(gender);
    setAnswer("gender", gender);
    setTimeout(() => goToStep(1), 350);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex justify-end p-4">
        <button
          onClick={() => setMenuOpen(true)}
          className="text-foreground text-2xl bg-transparent border-none cursor-pointer p-2"
        >
          ☰
        </button>
      </div>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        <span className="text-[12px] font-semibold tracking-[0.15em] uppercase mb-4 text-primary">
          3-MINUTE QUIZ
        </span>

        <h1 className="text-[28px] md:text-[36px] font-extrabold mb-2 text-center text-foreground tracking-tight">
          Unlock your personal AI income plan
        </h1>
        <p className="text-[15px] mb-8 text-center text-muted-foreground">
          Zero experience needed · No coding required
        </p>

        <div className="w-full max-w-[600px] grid grid-cols-2 gap-4 mb-8">
          {[
            { gender: "male", label: "Male", img: maleImg },
            { gender: "female", label: "Female", img: femaleImg },
          ].map((g) => (
            <button
              key={g.gender}
              onClick={() => handleSelect(g.gender)}
              className={`relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-200 p-0 ${
                selected === g.gender ? "border-2 border-primary" : "border border-border"
              } bg-card`}
            >
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  src={g.img}
                  alt={g.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="flex items-center justify-between px-5 py-4">
                <span className="text-foreground text-[16px] font-medium">{g.label}</span>
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm bg-gradient-primary">
                  →
                </span>
              </div>
            </button>
          ))}
        </div>


        <div className="flex gap-3 mt-6 text-[12px] text-muted-foreground">
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Privacy Policy</a>
          <span>·</span>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Terms</a>
          <span>·</span>
          <a href="/subscription" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Subscription Policy</a>
        </div>
      </div>
    </div>
  );
}

function QuizInner() {
  const { currentStep, answers } = useQuiz();
  const [showIntro, setShowIntro] = useState(() => !answers.gender);

  if (showIntro && !answers.gender) {
    return <IntroScreen onStart={() => setShowIntro(false)} />;
  }

  if (!answers.gender || currentStep === 0) {
    return <GenderScreen />;
  }

  return <QuizFlow />;
}

export default function Quiz() {
  return (
    <QuizProvider>
      <QuizInner />
    </QuizProvider>
  );
}

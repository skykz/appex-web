import { useEffect, useState } from "react";
import { QuizProvider, useQuiz } from "@/contexts/QuizContext";
import QuizFlow from "@/components/quiz/QuizFlow";
import { LegalLink } from "@/components/legal/LegalLink";
import { getQuizMenuLinks } from "@/lib/auth-links";
import { ga4QuizStep } from "@/lib/ga4";
import { pushToDataLayer } from "@/lib/gtm";

/** Fires quiz_step for a pre-QuizFlow intro screen (top of the funnel). */
function trackIntroStep(step_index: number, step_id: string, type: string): void {
  ga4QuizStep({ step_index, step_id, section: "intro", type });
  pushToDataLayer("quiz_step", { step_index, step_id, section: "intro", type });
}
import maleImg from "@/assets/quiz-male.jpg";
import femaleImg from "@/assets/quiz-female.jpg";

function SideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const menuLinks = getQuizMenuLinks();
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/60 z-[200]" onClick={onClose} />
      )}
      <div
        className="fixed top-0 right-0 h-full z-[201] transition-transform duration-300 bg-card border-l border-border flex flex-col"
        style={{
          width: 'min(320px, 85vw)',
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header with Docs title + close */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-foreground text-[22px] font-extrabold tracking-tight">Docs</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center border border-border rounded-md text-foreground text-lg bg-transparent cursor-pointer"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Docs links */}
        <div className="flex flex-col gap-1 px-6 flex-1">
          {menuLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={item.newTab ? "_blank" : undefined}
              rel={item.newTab ? "noopener noreferrer" : undefined}
              onClick={onClose}
              className="text-foreground text-[15px] py-2.5 hover:text-primary transition-colors"
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Footer support note */}
        <div className="px-6 pb-8 pt-4 border-t border-border">
          <p className="text-muted-foreground text-[13px] leading-relaxed">
            We will be glad to assist you via email. Please send your questions and feedback to{" "}
            <a
              href="mailto:hello@appexme.com"
              className="text-foreground font-semibold underline underline-offset-2 hover:text-primary transition-colors"
            >
              hello@appexme.com
            </a>
          </p>
        </div>
      </div>
    </>
  );
}


/* ── Intro splash screen ── */
function IntroScreen({ onStart }: { onStart: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Top-of-funnel screen ("Have you ever used Claude?"). step_index 0 keeps it
  // ahead of QuizFlow's 1..45. The gender screen that follows reports via
  // quiz_answer (gender is in INTRO_STEP_IDS), so it isn't double-counted here.
  useEffect(() => {
    trackIntroStep(0, "quiz_intro", "info");
  }, []);

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
        {/* Hero illustration — compact laptop mockup running Claude (responsive) */}
        <div className="relative mx-auto mb-4 md:mb-6 w-full max-w-[200px] md:max-w-[360px]">
          {/* Floating sparkles */}
          <span className="absolute -top-1 -left-2 text-[14px] opacity-60">✦</span>
          <span className="absolute -top-2 right-2 text-[12px] opacity-50">✦</span>

          {/* Laptop body */}
          <div className="relative">
            {/* Screen */}
            <div
              className="rounded-t-xl p-1.5"
              style={{
                background: 'linear-gradient(180deg, #1A1A1A 0%, #0D0D0D 100%)',
                boxShadow: '0 12px 28px -10px rgba(249,115,22,0.35)',
              }}
            >
              <div
                className="rounded-md p-2.5"
                style={{
                  background: '#FFF7ED',
                  aspectRatio: '16 / 10',
                }}
              >
                {/* Browser top bar */}
                <div className="flex items-center gap-1 mb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5F57]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FEBC2E]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#28C840]" />
                </div>

                {/* Claude logo in center */}
                <div className="flex items-center justify-center h-[calc(100%-16px)]">
                  <svg viewBox="0 0 100 100" className="w-12 h-12 md:w-20 md:h-20" aria-hidden>
                    {Array.from({ length: 10 }, (_, i) => (
                      <rect
                        key={i}
                        x="46"
                        y="10"
                        width="8"
                        height="34"
                        rx="4"
                        fill="#F97316"
                        transform={`rotate(${i * 36} 50 50)`}
                      />
                    ))}
                  </svg>
                </div>
              </div>
            </div>

            {/* Laptop base */}
            <div
              className="h-2 rounded-b-xl"
              style={{
                background: 'linear-gradient(180deg, #2A2A2A 0%, #1A1A1A 100%)',
                width: '110%',
                marginLeft: '-5%',
              }}
            />
            {/* Notch / trackpad */}
            <div className="h-0.5 mx-auto rounded-full" style={{ width: '20%', background: '#444', marginTop: '-1px' }} />
          </div>

          {/* Floating spark badge */}
          <div className="absolute -top-2 -right-3 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-[14px]">
            💡
          </div>
        </div>

        <h1 className="text-[28px] md:text-[36px] font-extrabold leading-tight mb-3 text-center max-w-[520px]" style={{ color: '#111' }}>
          Become the Certified Master of Claude
        </h1>
        <p className="text-[16px] md:text-[17px] mb-8 text-center" style={{ color: '#475569' }}>
          Have you ever used Claude?
        </p>

        <div className="w-full max-w-[520px] grid grid-cols-1 min-[380px]:grid-cols-2 gap-3 mb-8">
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
          <LegalLink href="/terms" className="underline" style={{ color: '#F97316' }}>Terms and Conditions</LegalLink>,{" "}
          <LegalLink href="/privacy" className="underline" style={{ color: '#F97316' }}>Privacy Policy</LegalLink>,{" "}
          <LegalLink href="/subscription" className="underline" style={{ color: '#F97316' }}>Subscription Terms</LegalLink>
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
          <LegalLink href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</LegalLink>
          <span>·</span>
          <LegalLink href="/terms" className="hover:text-foreground transition-colors">Terms</LegalLink>
          <span>·</span>
          <LegalLink href="/subscription" className="hover:text-foreground transition-colors">Subscription Policy</LegalLink>
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

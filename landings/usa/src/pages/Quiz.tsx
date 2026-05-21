import { useState, useEffect } from "react";
import { QuizProvider, useQuiz } from "@/contexts/QuizContext";
import QuizFlow from "@/components/quiz/QuizFlow";
import maleImg from "@/assets/quiz-male.jpg";
import femaleImg from "@/assets/quiz-female.jpg";
import heroPersonImg from "@/assets/quiz-hero-person.png";

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
          {["Privacy Policy", "Money-back Policy", "Subscription Privacy", "I already have an account"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-foreground text-[16px] py-3 hover:text-primary transition-colors"
            >
              {item}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}

/* ── Before / After phone mockup ── */
function PhoneMockup({ type, amount }: { type: "before" | "after"; amount: string }) {
  const isBefore = type === "before";
  return (
    <div className="w-[160px] sm:w-[180px] rounded-2xl overflow-hidden border border-border bg-card shadow-2xl">
      {/* Phone top bar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
        </div>
        <div className="w-3 h-3 rounded-full bg-muted-foreground/20" />
      </div>

      {/* Badge */}
      <div className="px-3 pt-3">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
          isBefore
            ? "bg-destructive/20 text-destructive"
            : "bg-primary/20 text-primary"
        }`}>
          {type}
        </span>
      </div>

      {/* Profile area */}
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-7 h-7 rounded-full bg-muted" />
        <div>
          <p className="text-[11px] font-semibold text-foreground">Sarah M.</p>
          <p className="text-[9px] text-muted-foreground">AI Specialist</p>
        </div>
      </div>

      {/* Earnings */}
      <div className="px-3 pb-2">
        <p className="text-[9px] text-muted-foreground mb-0.5">Earnings in the last 28 days</p>
        <p className={`text-[28px] font-black tracking-tight ${
          isBefore ? "text-muted-foreground" : "text-primary"
        }`}>
          {amount}
        </p>
      </div>

      {/* Fake stats */}
      <div className="px-3 pb-3 space-y-1.5">
        <div className="h-2 rounded-full bg-muted w-full" />
        <div className="h-2 rounded-full bg-muted w-3/4" />
        <div className={`h-2 rounded-full w-1/2 ${isBefore ? "bg-muted" : "bg-primary/40"}`} />
      </div>
    </div>
  );
}

/* ── Animated counter ── */
function AnimCount({ target, prefix = "" }: { target: number; prefix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const dur = 1200;
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      setVal(Math.round(target * p));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return <>{prefix}{val.toLocaleString()}</>;
}

/* ── Intro splash screen ── */
function IntroScreen({ onStart }: { onStart: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-5 py-4">
        <span className="text-foreground font-bold text-lg tracking-tight">Appex</span>
        <button
          onClick={() => setMenuOpen(true)}
          className="text-foreground text-2xl bg-transparent border-none cursor-pointer p-2"
        >
          ☰
        </button>
      </div>

      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
        {/* Heading */}
        <h1 className="text-[28px] sm:text-[38px] md:text-[46px] font-black text-center text-foreground leading-[1.1] mb-3 tracking-tight">
          Earn $50K–100K per year{" "}
          <span className="text-primary">Building AI Agents</span>
        </h1>
        <p className="text-[15px] sm:text-[17px] text-muted-foreground text-center mb-10 max-w-md">
          Take the quiz. Start earning with zero experience.
        </p>

        {/* Visual section: phones + person */}
        <div className="relative flex items-end justify-center mb-6 w-full max-w-lg">
          {/* Before phone */}
          <div className="relative z-10 transform -rotate-2">
            <PhoneMockup type="before" amount="$0.00" />
          </div>
          {/* After phone */}
          <div className="relative z-10 transform rotate-2 -ml-3">
            <PhoneMockup type="after" amount="$10K" />
          </div>
          {/* Person image */}
          <div className="relative z-20 -ml-4 mb-0 hidden sm:block">
            <img
              src={heroPersonImg}
              alt="Appex student"
              className="h-[260px] md:h-[320px] object-contain drop-shadow-2xl"
              width={256}
              height={320}
            />
          </div>
        </div>

        {/* Testimonial card */}
        <div className="w-full max-w-md rounded-xl border border-border bg-card px-5 py-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] text-muted-foreground">Sarah, ex-office worker from Texas</p>
            <span className="text-primary/60 text-2xl font-serif">❞</span>
          </div>
          <p className="text-[15px] text-foreground font-medium leading-relaxed">
            "I finally became financially independent with Appex"
          </p>
        </div>

        {/* Trust bar */}
        <div className="w-full max-w-md rounded-xl px-5 py-4 flex flex-wrap items-center justify-center gap-5 bg-card border border-border mb-8">
          <div className="flex flex-col items-center text-center">
            <span className="text-[17px] font-bold text-primary">
              <AnimCount target={253000} />+
            </span>
            <span className="text-[10px] text-muted-foreground">new specialists with us</span>
          </div>
          <div className="w-px h-7 bg-border" />
          <div className="flex flex-col items-center text-center">
            <span className="text-[17px] font-bold text-primary">4.5</span>
            <div className="flex gap-0.5 my-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className="text-[11px] text-primary">★</span>
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground">on Trustpilot</span>
          </div>
          <div className="w-px h-7 bg-border" />
          <div className="flex flex-col items-center text-center">
            <span className="text-[13px] font-bold text-foreground">WIN WIN</span>
            <span className="text-[10px] text-muted-foreground">Money back guarantee</span>
          </div>
        </div>

        {/* CTA Button — fixed at bottom on mobile */}
        <div className="w-full max-w-md">
          <button
            onClick={onStart}
            className="w-full py-4 rounded-xl text-[17px] font-bold text-white border-none cursor-pointer bg-gradient-primary hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
          >
            Get started
          </button>
        </div>

        {/* Footer links */}
        <div className="flex gap-3 mt-5 text-[11px] text-muted-foreground">
          <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
          <span>·</span>
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          <span>·</span>
          <a href="#" className="hover:text-foreground transition-colors">Subscription Policy</a>
        </div>
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
          <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
          <span>·</span>
          <a href="#" className="hover:text-foreground transition-colors">Terms</a>
          <span>·</span>
          <a href="#" className="hover:text-foreground transition-colors">Subscription Policy</a>
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

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, X, ChevronRight, Sparkles, Briefcase, Target, TrendingUp,
  PenTool, Handshake, RefreshCcw, Compass, Zap, ShieldCheck, Banknote,
  Bot, Frown, FileX, Clock, Check, Cloud, BookX, Meh, ThumbsUp, Smile,
  Loader, Trophy, Lock, Lightbulb, Mail, User as UserIcon, AlertTriangle,
  Heart, Calendar,
  ClipboardList, PenSquare, Flag,
} from "lucide-react";
import { useQuiz, Answers, TOTAL_STEPS } from "./QuizContext";
import mentorImg from "@/assets/quiz-mentor.jpg";
import skillsCollageImg from "@/assets/quiz-skills-collage.jpg";
import womanIncomeImg from "@/assets/quiz-woman-income.jpg";
import editorImproveImg from "@/assets/quiz-editor-improve.jpg";
import expenseAppImg from "@/assets/quiz-expense-app.jpg";

/* -------------------------------------------------------------------------- */
/*                              Shared UI bits                                */
/* -------------------------------------------------------------------------- */

const C = {
  text: "#111",
  primary: "#F97316",
  success: "#1A8A3F",
  warning: "#C0392B",
  card: "#F2F4F8",
  border: "#E5E7EB",
  muted: "#6B7280",
};

// Map steps -> phase index (0..2) and within-phase progress
function phaseInfo(step: number) {
  // Phase 0 (My profile): 1-11, Phase 1 (Challenges): 12-17, Phase 2 (Personalization): 18-27, Phase 3 (no tabs): 28-32
  if (step <= 11) return { phase: 0, idx: step, total: 11 };
  if (step <= 17) return { phase: 1, idx: step - 11, total: 6 };
  if (step <= 28) return { phase: 2, idx: step - 17, total: 11 };
  return { phase: 3, idx: step - 28, total: 5 };
}

const PHASE_LABELS = ["My profile", "Challenges", "Personalization"];

function QuizMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-[10001]" onClick={onClose} />
      )}
      <div
        className="fixed top-0 right-0 h-full z-[10002] bg-white shadow-2xl transition-transform duration-300"
        style={{ width: 280, transform: open ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div className="flex items-center justify-between px-5 h-14 border-b" style={{ borderColor: C.border }}>
          <span className="font-extrabold text-[18px]">
            <span style={{ color: '#111' }}>App</span><span style={{ color: '#F97316' }}>ex</span>
          </span>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-transparent border-none cursor-pointer" style={{ color: C.text }}>
            <X size={20} color={C.text} />
          </button>
        </div>
        <div className="flex flex-col pt-4 px-5">
          {[
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Money-back Policy', href: '/subscription' },
            { label: 'Subscription Terms', href: '/subscription' },
            { label: 'Terms and Conditions', href: '/terms' },
            { label: 'I already have an account', href: '#' },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="py-3.5 text-[15px] border-b no-underline transition-colors"
              style={{ color: C.text, borderColor: C.border }}
            >
              {item.label}
            </a>
          ))}
        </div>
        <div className="absolute bottom-8 left-5 right-5">
          <p className="text-[12px]" style={{ color: C.muted }}>
            Questions? Email us at{' '}
            <a href="mailto:support@appex.me" style={{ color: '#F97316' }}>support@appex.me</a>
          </p>
        </div>
      </div>
    </>
  );
}

// Steps that show only the logo (no back button, no menu, no tabs)
const LOGO_ONLY_STEPS = new Set([2, 8, 11, 14, 17, 23, 25, 28, 29, 30, 31, 32, 33]);

function TopBar() {
  const { step, prev } = useQuiz();
  const [menuOpen, setMenuOpen] = useState(false);
  const { phase, idx, total } = phaseInfo(step);
  const isFirst = step === 1;
  const logoOnly = LOGO_ONLY_STEPS.has(step);
  const showTabs = !isFirst && !logoOnly && phase <= 2;
  const seg = (i: number) => {
    if (i < phase) return 1;
    if (i > phase) return 0;
    return Math.min(idx / total, 1);
  };

  // Step 1: back (disabled) + logo + hamburger
  if (isFirst) {
    return (
      <>
        <QuizMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
        <div className="sticky top-0 z-10 bg-white border-b" style={{ borderColor: C.border }}>
          <div className="mx-auto w-full max-w-[520px] flex items-center justify-between px-4 h-12">
            <button
              onClick={prev}
              disabled
              aria-label="Back"
              className="w-9 h-9 -ml-2 flex items-center justify-center rounded-full opacity-30"
            >
              <ChevronLeft size={22} color={C.text} />
            </button>
            <div className="font-extrabold tracking-tight text-[20px]">
              <span style={{ color: '#111' }}>App</span><span style={{ color: '#F97316' }}>ex</span>
            </div>
            <button
              onClick={() => setMenuOpen(true)}
              aria-label="Menu"
              className="w-9 h-9 -mr-2 flex items-center justify-center rounded-full bg-transparent border-none cursor-pointer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </>
    );
  }

  // Card steps: back + logo
  if (logoOnly) {
    return (
      <div className="sticky top-0 z-10 bg-white border-b" style={{ borderColor: C.border }}>
        <div className="mx-auto w-full max-w-[520px] flex items-center justify-between px-4 h-12">
          <button
            onClick={prev}
            aria-label="Back"
            className="w-9 h-9 -ml-2 flex items-center justify-center rounded-full"
          >
            <ChevronLeft size={22} color={C.text} />
          </button>
          <div className="font-extrabold tracking-tight text-[20px]">
            <span style={{ color: '#111' }}>App</span><span style={{ color: '#F97316' }}>ex</span>
          </div>
          <div className="w-9" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-10 bg-white border-b" style={{ borderColor: C.border }}>
        <div className="mx-auto w-full max-w-[520px] flex items-center justify-between px-4 h-12">
          <button
            onClick={prev}
            aria-label="Back"
            className="w-9 h-9 -ml-2 flex items-center justify-center rounded-full"
          >
            <ChevronLeft size={22} color={C.text} />
          </button>
          <div className="font-extrabold tracking-tight text-[20px]">
            <span style={{ color: '#111' }}>App</span><span style={{ color: '#F97316' }}>ex</span>
          </div>
          <div className="w-9" />
        </div>
        {showTabs && (
          <div className="mx-auto w-full max-w-[520px] px-4 pb-3 flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex-1 flex flex-col gap-1">
                <div
                  className="text-[11px] font-semibold truncate"
                  style={{ color: i === phase ? C.text : C.muted, opacity: i === phase ? 1 : 0.6 }}
                >
                  {PHASE_LABELS[i]}
                </div>
                <div className="h-1 rounded-full overflow-hidden" style={{ background: "#E5E7EB" }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ background: '#F97316', width: `${seg(i) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function StepShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[520px] px-5 py-5 animate-[fadeUp_0.35s_ease-out]">
      {children}
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-[22px] md:text-[26px] leading-tight font-extrabold mb-2 tracking-tight" style={{ color: C.text }}>
      {children}
    </h1>
  );
}
function Sub({ children }: { children: React.ReactNode }) {
  return <p className="text-[16px] mb-8" style={{ color: C.muted }}>{children}</p>;
}

function PrimaryButton({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-full py-4 text-white font-semibold text-[16px] transition-opacity"
      style={{ background: disabled ? "#9CA3AF" : C.primary, opacity: disabled ? 0.7 : 1 }}
    >
      {children}
    </button>
  );
}

// Sticky bottom button for card steps — sticks to bottom of the overlay scroll container
function StickyButton({
  children, onClick, disabled,
}: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <div className="sticky bottom-0 -mx-5 px-5 pt-6" style={{ marginBottom: '-2rem', paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 16px))', background: 'linear-gradient(to bottom, transparent, white 35%)' }}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full rounded-full py-4 text-white font-semibold text-[16px] transition-opacity"
        style={{ background: disabled ? "#9CA3AF" : "#111", opacity: disabled ? 0.7 : 1 }}
      >
        {children}
      </button>
    </div>
  );
}

function OutlineButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-full py-4 font-semibold text-[16px]"
      style={{ background: "white", color: C.text, border: `1.5px solid ${C.border}` }}
    >
      {children}
    </button>
  );
}

type Opt = { value: string; label: string; Icon?: React.ComponentType<any> };

function OptionList<T extends string>({
  options, value, onPick,
}: { options: Opt[]; value?: T; onPick: (v: T) => void }) {
  const [picked, setPicked] = useState<string | undefined>(value);
  return (
    <div className="flex flex-col gap-3">
      {options.map((o, i) => {
        const active = picked === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              setPicked(o.value);
              setTimeout(() => onPick(o.value as T), 220);
            }}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-4 text-left transition-all animate-[fadeUp_0.35s_ease-out]"
            style={{
              background: "white",
              border: `1.5px solid ${active ? C.primary : C.border}`,
              boxShadow: active ? "0 8px 24px -10px rgba(47,79,224,0.35)" : "none",
              animationDelay: `${60 + i * 50}ms`,
              animationFillMode: "backwards",
            }}
          >
            {o.Icon && (
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: active ? "rgba(47,79,224,0.10)" : C.card }}
              >
                <o.Icon size={20} color={active ? C.primary : C.text} />
              </span>
            )}
            <span className="flex-1 text-[17px] font-medium" style={{ color: C.text }}>{o.label}</span>
            <span
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              style={{ borderColor: active ? C.primary : "#D1D5DB" }}
            >
              {active && <span className="w-2.5 h-2.5 rounded-full" style={{ background: C.primary }} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function GreenCheckList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-3 my-5">
      {items.map((t) => (
        <li key={t} className="flex items-start gap-3">
          <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "rgba(26,138,63,0.12)" }}>
            <Check size={14} color={C.success} strokeWidth={3} />
          </span>
          <span className="text-[15px]" style={{ color: C.text }}>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function PlaceholderImage({ label, h = 200 }: { label: string; h?: number }) {
  return (
    <div
      className="w-full rounded-2xl flex items-center justify-center text-center px-6 mb-6"
      style={{ background: C.card, height: h, color: C.muted, fontSize: 13 }}
    >
      {label}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Step screens                                 */
/* -------------------------------------------------------------------------- */

function pickAndNext<K extends keyof Answers>(set: any, next: any, key: K) {
  return (v: Answers[K]) => { set(key, v); next(); };
}

function S1() {
  const { set, next } = useQuiz();
  const choose = (v: "yes" | "no") => { set("experience_with_claude", v); next(); };
  return (
    <StepShell>
      <div className="relative mx-auto mb-8 rounded-3xl flex items-center justify-center overflow-hidden" style={{ background: '#FFF7ED', width: '100%', maxWidth: 380, aspectRatio: '1 / 1' }}>
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
      <h1 className="text-[28px] md:text-[32px] leading-tight font-extrabold mb-3 tracking-tight text-center" style={{ color: C.text }}>
        Become the Certified Master of Claude
      </h1>
      <p className="text-[16px] mb-8 text-center" style={{ color: C.muted }}>Have you ever used Claude?</p>
      <div className="grid grid-cols-2 gap-3 mb-10">
        {(["yes", "no"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => choose(v)}
            className="rounded-2xl py-4 text-white font-semibold text-[16px] flex items-center justify-center gap-1"
            style={{ background: C.primary }}
          >
            {v === "yes" ? "Yes" : "No"} <ChevronRight size={18} />
          </button>
        ))}
      </div>
      <div className="text-center text-[11px] leading-relaxed" style={{ color: C.muted }}>
        <div className="flex justify-center gap-2 flex-wrap mb-2">
          <a href="/terms" className="underline">Terms and Conditions</a>·
          <a href="/privacy" className="underline">Privacy Policy</a>·
          <a href="/subscription" className="underline">Subscription Terms</a>
        </div>
      </div>
    </StepShell>
  );
}

function S2() {
  const { answers, next } = useQuiz();
  const yes = answers.experience_with_claude === "yes";
  return (
    <StepShell>
      <img src={skillsCollageImg} alt="Skill cards" width={896} height={640} loading="lazy" className="w-full rounded-2xl mb-6 object-cover" style={{ maxHeight: 220 }} />
      <Heading>{yes ? "You're ahead — but this is just the start" : "You're right on time — this is where it starts"}</Heading>
      <Sub>
        {yes
          ? "Getting started already puts you ahead of 83% of people — but the biggest gap happens next. Some people stay at the surface, others go deeper and unlock what AI can really do."
          : "Most people begin exactly where you are — with no experience at all. In fact, some of our best students started from zero. The real difference is what you do next."}
      </Sub>
      <StickyButton onClick={next}>Continue</StickyButton>
    </StepShell>
  );
}

function S3() {
  const { set, next, answers } = useQuiz();
  return (
    <StepShell>
      <Heading>I want to learn Claude for…</Heading>
      <OptionList
        value={answers.learning_intent}
        onPick={pickAndNext(set, next, "learning_intent")}
        options={[
          { value: "work", label: "Work tasks", Icon: Briefcase },
          { value: "personal", label: "Personal use", Icon: Target },
          { value: "growth", label: "Growth — I love learning in-demand skills", Icon: TrendingUp },
        ]}
      />
    </StepShell>
  );
}

function S4() {
  const { set, next, answers } = useQuiz();
  return (
    <StepShell>
      <Heading>What's your current work status?</Heading>
      <OptionList
        value={answers.work_status}
        onPick={pickAndNext(set, next, "work_status")}
        options={[
          { value: "employee", label: "Full-time employee", Icon: Briefcase },
          { value: "freelancer", label: "Freelancer / Self-employed", Icon: PenTool },
          { value: "owner", label: "Business owner", Icon: Handshake },
          { value: "switcher", label: "Between jobs / Career switcher", Icon: RefreshCcw },
          { value: "exploring", label: "Exploring options", Icon: Compass },
        ]}
      />
    </StepShell>
  );
}

function S5() {
  const { set, next, answers } = useQuiz();
  return (
    <StepShell>
      <Heading>How old are you?</Heading>
      <OptionList
        value={answers.age_band}
        onPick={pickAndNext(set, next, "age_band")}
        options={[
          { value: "18-24", label: "18-24" },
          { value: "25-34", label: "25-34" },
          { value: "35-44", label: "35-44" },
          { value: "45-54", label: "45-54" },
          { value: "55+", label: "55+" },
        ]}
      />
    </StepShell>
  );
}

function SGender() {
  const { set, next, answers } = useQuiz();
  return (
    <StepShell>
      <Heading>What is your gender identity?</Heading>
      <OptionList
        value={answers.gender}
        onPick={pickAndNext(set, next, "gender")}
        options={[
          { value: "female", label: "Female" },
          { value: "male", label: "Male" },
          { value: "skip", label: "I'd rather skip this one" },
        ]}
      />
    </StepShell>
  );
}

function SRecap() {
  const { answers, next, goto } = useQuiz();
  const ageLabel = answers.age_band || "—";
  const statusLabels: Record<string, string> = {
    employee: "Full-time employee",
    freelancer: "Freelancer / Self-employed",
    owner: "Business owner",
    switcher: "Career switcher",
    exploring: "Exploring options",
  };
  const goalLabels: Record<string, string> = {
    promotion: "Get a promotion or a better job",
    faster: "Work faster",
    confidence: "Feel more confident with AI",
    business: "Start my own business",
    earn_more: "Earn more",
  };
  const rows: { label: string; value: string }[] = [
    { label: "Your age:", value: ageLabel },
    { label: "Current status:", value: statusLabels[answers.work_status || ""] || "—" },
    { label: "Experience with AI:", value: answers.experience_with_claude === "yes" ? "Present" : "Absent" },
    { label: "Main goal:", value: goalLabels[answers.main_goal || ""] || "—" },
  ];
  return (
    <StepShell>
      <Heading>Did we get everything right?</Heading>
      <div className="rounded-2xl p-2 mb-8 mt-2" style={{ background: C.card }}>
        {rows.map((r, i) => (
          <div
            key={r.label}
            className="flex items-center justify-between px-4 py-4"
            style={{ borderTop: i === 0 ? "none" : `1px solid ${C.border}` }}
          >
            <span className="text-[15px]" style={{ color: C.muted }}>{r.label}</span>
            <span className="text-[15px] font-medium text-right" style={{ color: C.text }}>{r.value}</span>
          </div>
        ))}
      </div>
      <div className="sticky bottom-0 -mx-5 px-5 pt-6 flex flex-col gap-3" style={{ marginBottom: '-2rem', paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 16px))', background: 'linear-gradient(to bottom, transparent, white 35%)' }}>
        <PrimaryButton onClick={next}>Yes, correct</PrimaryButton>
        <OutlineButton onClick={() => goto(5)}>Change answers</OutlineButton>
      </div>
    </StepShell>
  );
}

function S6() {
  const { set, next, answers } = useQuiz();
  return (
    <StepShell>
      <Heading>How would learning Claude benefit you?</Heading>
      <OptionList
        value={answers.main_goal}
        onPick={pickAndNext(set, next, "main_goal")}
        options={[
          { value: "promotion", label: "Get a promotion or a better job", Icon: TrendingUp },
          { value: "faster", label: "Work faster", Icon: Zap },
          { value: "confidence", label: "Feel more confident with AI", Icon: ShieldCheck },
          { value: "business", label: "Start my own business", Icon: Briefcase },
          { value: "earn_more", label: "Earn more", Icon: Banknote },
        ]}
      />
    </StepShell>
  );
}

function S7() {
  const { set, next, answers } = useQuiz();
  return (
    <StepShell>
      <Heading>What scares you most about AI and your career?</Heading>
      <OptionList
        value={answers.primary_fear}
        onPick={pickAndNext(set, next, "primary_fear")}
        options={[
          { value: "replaced", label: "Being replaced by someone who uses AI better", Icon: Bot },
          { value: "behind", label: "Falling behind as others move faster", Icon: Frown },
          { value: "opportunities", label: "Losing opportunities without AI on my resume", Icon: FileX },
          { value: "none", label: "Nothing — I see AI as an opportunity, not a threat", Icon: ShieldCheck },
        ]}
      />
    </StepShell>
  );
}

function SAiRating() {
  const { set, next, answers } = useQuiz();
  return (
    <StepShell>
      <Heading>How would you rate your experience with AI so far?</Heading>
      <OptionList
        value={answers.ai_experience_rating}
        onPick={pickAndNext(set, next, "ai_experience_rating")}
        options={[
          { value: "great", label: "Great - AI already helps me a lot", Icon: Smile },
          { value: "good", label: "Good - but I still have a lot to learn", Icon: ThumbsUp },
          { value: "frustrating", label: "Frustrating - I can't get it to do what I want", Icon: Meh },
          { value: "untried", label: "I haven't really tried yet", Icon: BookX },
        ]}
      />
    </StepShell>
  );
}

function S8() {
  const { next } = useQuiz();
  return (
    <StepShell>
      <img src={womanIncomeImg} alt="Earning more with AI" width={896} height={640} loading="lazy" className="w-full rounded-2xl mb-6 object-cover" style={{ maxHeight: 220 }} />
      <Heading>There is nothing to worry about</Heading>
      <Sub>The question isn't whether AI will change your career — it already is. The only question is: will you be the one using it, or the one replaced by someone who does?</Sub>
      <div className="rounded-2xl p-4 mb-6 text-[14px]" style={{ background: "rgba(47,79,224,0.08)", color: C.text, border: `1px solid rgba(47,79,224,0.18)` }}>
        According to Harvard Business School, AI won't replace people. But people who use AI will replace people who don't.
      </div>
      <StickyButton onClick={next}>Continue</StickyButton>
    </StepShell>
  );
}

function S9() {
  const { set, next, answers } = useQuiz();
  return (
    <StepShell>
      <Heading>How much time do you lose on repetitive file & document tasks?</Heading>
      <OptionList
        value={answers.time_lost_files}
        onPick={pickAndNext(set, next, "time_lost_files")}
        options={[
          { value: "30m-1h", label: "30 minutes - 1 hour/day", Icon: Clock },
          { value: "1-3h", label: "1-3 hours/day", Icon: Clock },
          { value: "3h+", label: "More than 3 hours/day", Icon: Clock },
        ]}
      />
    </StepShell>
  );
}

function S10() {
  const { set, next, answers } = useQuiz();
  return (
    <StepShell>
      <Heading>Have you ever used AI to write something and then spent just as long fixing it?</Heading>
      <OptionList
        value={answers.ai_rework_experience}
        onPick={pickAndNext(set, next, "ai_rework_experience")}
        options={[
          { value: "every_time", label: "Yes, every time - it's barely faster", Icon: Check },
          { value: "sometimes", label: "Sometimes - it needs a lot of editing", Icon: Cloud },
          { value: "works_well", label: "No - AI works well for me", Icon: X },
          { value: "untried", label: "I haven't tried using AI for writing", Icon: PenTool },
        ]}
      />
    </StepShell>
  );
}

function S11() {
  const { next } = useQuiz();
  return (
    <StepShell>
      <img src={editorImproveImg} alt="Editor with Improve text menu" width={896} height={640} loading="lazy" className="w-full rounded-2xl mb-6 object-cover" style={{ maxHeight: 220 }} />
      <Heading>Create polished content <span style={{ color: C.primary }}>4x faster</span></Heading>
      <Sub>Once you learn how to use Claude, it gives you more than drafts. It creates polished, formatted, ready-to-use documents — right in the conversation. No copy-pasting. No reformatting. Done.</Sub>
      <GreenCheckList items={[
        "Full documents with structure and formatting",
        "Interactive tables, charts, and dashboards",
        "Reports with data visualizations",
        "Everything is editable and exportable instantly",
      ]} />
      <StickyButton onClick={next}>Continue</StickyButton>
    </StepShell>
  );
}

function S12() {
  const { set, next, answers } = useQuiz();
  return (
    <StepShell>
      <Heading>Have you ever had an idea for an app, website, or tool — but couldn't build it?</Heading>
      <OptionList
        value={answers.had_unbuilt_idea}
        onPick={pickAndNext(set, next, "had_unbuilt_idea")}
        options={[
          { value: "yes", label: "Yes", Icon: Check },
          { value: "no", label: "No", Icon: X },
        ]}
      />
    </StepShell>
  );
}

function S13() {
  const { set, next, answers } = useQuiz();
  return (
    <StepShell>
      <Heading>Do you believe you could build a real working app with no coding experience?</Heading>
      <OptionList
        value={answers.belief_no_code}
        onPick={pickAndNext(set, next, "belief_no_code")}
        options={[
          { value: "unlikely", label: "No, that seems unlikely", Icon: BookX },
          { value: "skeptical", label: "Maybe with AI, but I'm skeptical", Icon: Meh },
          { value: "seen_it", label: "Yes — I've seen people do it", Icon: ThumbsUp },
        ]}
      />
    </StepShell>
  );
}

function S14() {
  const { next } = useQuiz();
  return (
    <StepShell>
      <img src={expenseAppImg} alt="Expense calculator app" width={896} height={640} loading="lazy" className="w-full rounded-2xl mb-6 object-cover" style={{ maxHeight: 220 }} />
      <Heading>Building an app has never been this easy.</Heading>
      <Sub>Need a tracker? A dashboard? A client tool? A portfolio site? Just tell Claude what you want. In 5 minutes, it's built, tested, and ready to use. No code. No developer. No $5,000 invoice. Just you and Claude.</Sub>
      <GreenCheckList items={[
        "Describe your idea in normal language",
        "Claude builds, tests, and debugs the entire thing",
        "Websites, tools, automations, dashboards, apps",
        "No coding experience required — zero",
      ]} />
      <StickyButton onClick={next}>Continue</StickyButton>
    </StepShell>
  );
}

function S15() {
  const { set, next, answers } = useQuiz();
  return (
    <StepShell>
      <Heading>How much time you want to dedicate to achieve your goal?</Heading>
      <OptionList
        value={answers.daily_time_commitment}
        onPick={pickAndNext(set, next, "daily_time_commitment")}
        options={[
          { value: "10min", label: "10 min/day", Icon: Clock },
          { value: "20min", label: "20 min/day", Icon: Clock },
          { value: "30min", label: "30 min/day", Icon: Clock },
          { value: "1hour", label: "1 hour/day", Icon: Clock },
        ]}
      />
    </StepShell>
  );
}

function SLearnPace() {
  const { set, next, answers } = useQuiz();
  return (
    <StepShell>
      <Heading>How do you prefer to learn?</Heading>
      <OptionList
        value={answers.learning_pace}
        onPick={pickAndNext(set, next, "learning_pace")}
        options={[
          { value: "own_pace", label: "At my own pace", Icon: Heart },
          { value: "deadlines", label: "With set deadlines", Icon: Calendar },
        ]}
      />
    </StepShell>
  );
}

function SApproach() {
  const { set, next, answers } = useQuiz();
  return (
    <StepShell>
      <Heading>What approach works best for you?</Heading>
      <OptionList
        value={answers.learning_approach}
        onPick={pickAndNext(set, next, "learning_approach")}
        options={[
          { value: "theory_practice", label: "80% theory + 20% practice", Icon: ClipboardList },
          { value: "practice_theory", label: "80% practice + 20% theory", Icon: PenSquare },
        ]}
      />
    </StepShell>
  );
}

function SPortfolio() {
  const { set, next, answers } = useQuiz();
  return (
    <StepShell>
      <div className="mx-auto mb-6 rounded-2xl p-4" style={{ background: "#FFF7ED", maxWidth: 360 }}>
        <div className="rounded-xl bg-white shadow-sm p-3">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-2">
            <span>🌐</span>
            <span>https://myportfolio.appex.me</span>
          </div>
          <div className="rounded-md bg-gray-100 px-2 py-1.5 flex items-center gap-1.5 mb-2">
            <div className="w-4 h-4 rounded-sm" style={{ background: C.primary }} />
            <span className="text-[11px] font-semibold" style={{ color: '#111' }}>My Portfolio</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-200 mb-2" />
          <div className="h-1.5 w-2/3 rounded bg-gray-200 mb-1.5" />
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {["Automation", "Artificial Intelligence", "Agentic systems", "Chatbots"].map((t) => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: "#FFF0E6", color: C.primary }}>{t}</span>
            ))}
          </div>
          <div className="h-1.5 w-1/2 rounded bg-gray-200 mb-3" />
          <button className="text-[10px] text-white px-2.5 py-1 rounded-full" style={{ background: C.primary }}>
            Get in touch →
          </button>
        </div>
      </div>
      <Heading>Would you like to include your projects to a portfolio site we built for you?</Heading>
      <OptionList
        value={answers.include_portfolio}
        onPick={pickAndNext(set, next, "include_portfolio")}
        options={[
          { value: "yes", label: "Yes", Icon: Check },
          { value: "no", label: "No", Icon: X },
        ]}
      />
    </StepShell>
  );
}

function S16() {
  const { set, next, answers } = useQuiz();
  return (
    <StepShell>
      <div className="relative mx-auto mb-6 rounded-2xl overflow-hidden" style={{ background: "#FFF7ED", maxWidth: 360, aspectRatio: "4 / 3" }}>
        <img
          src={mentorImg}
          alt="AI mentor"
          loading="lazy"
          className="absolute right-0 bottom-0 h-full w-[55%] object-cover"
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 w-[52%] rounded-xl bg-white shadow-md p-2.5">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 rounded-full bg-gray-300" />
            <div className="leading-tight">
              <div className="text-[10px] font-semibold">Mark</div>
              <div className="text-[8px] text-gray-500">AI mentor</div>
            </div>
          </div>
          <div className="flex justify-center mb-1.5">
            <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Today</span>
          </div>
          <div className="rounded-md bg-gray-50 p-1.5">
            <div className="text-[8px] font-semibold mb-0.5">Mark</div>
            <div className="text-[8px] leading-snug text-gray-700">
              Hello! I'm here to help you learn AI automation. Ready with tips and recommendations for your workflow. Any questions about the content?
            </div>
            <div className="text-[7px] text-gray-400 text-right mt-0.5">12:32</div>
          </div>
        </div>
      </div>
      <Heading>Would you like an AI mentor to guide you as you learn?</Heading>
      <OptionList
        value={answers.wants_mentor}
        onPick={pickAndNext(set, next, "wants_mentor")}
        options={[
          { value: "yes", label: "Yes", Icon: Check },
          { value: "no", label: "No", Icon: X },
        ]}
      />
    </StepShell>
  );
}

function S17() {
  const { next } = useQuiz();
  // Curvy roadmap: alternating left/right nodes connected by an S-curve path
  const nodes = [
    { label: "Claude Fundamentals", side: "left" as const, active: true, icon: "flag" as const },
    { label: "Artifacts & Documents", side: "right" as const, active: false, icon: "lock" as const },
    { label: "Claude Code Projects", side: "left" as const, active: false, icon: "lock" as const },
    { label: "Real-World Projects", side: "right" as const, active: false, icon: "lock" as const },
    { label: "Get Certified", side: "left" as const, active: false, icon: "trophy" as const },
  ];
  const W = 280;
  const stepY = 95;
  const H = stepY * (nodes.length - 1) + 80;
  const xLeft = 70;
  const xRight = W - 70;
  const xFor = (s: "left" | "right") => (s === "left" ? xLeft : xRight);
  const yFor = (i: number) => 40 + i * stepY;
  let pathD = `M ${xFor(nodes[0].side)} ${yFor(0)}`;
  for (let i = 1; i < nodes.length; i++) {
    const x1 = xFor(nodes[i - 1].side);
    const y1 = yFor(i - 1);
    const x2 = xFor(nodes[i].side);
    const y2 = yFor(i);
    const cy = (y1 + y2) / 2;
    pathD += ` C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
  }
  return (
    <StepShell>
      <Heading>Your guided step-by-step plan is almost ready!</Heading>
      <div className="relative mx-auto my-4" style={{ width: W, height: H }}>
        <svg width={W} height={H} className="absolute inset-0" style={{ overflow: "visible" }}>
          <path d={pathD} fill="none" stroke="#E5E7EB" strokeWidth={6} strokeLinecap="round" />
        </svg>
        {nodes.map((n, i) => {
          const cx = xFor(n.side);
          const cy = yFor(i);
          const labelLeft = n.side === "right";
          return (
            <div key={n.label} className="absolute" style={{ left: cx, top: cy, transform: "translate(-50%, -50%)" }}>
              <div
                className="relative w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: n.active ? "#FFF7ED" : "#F3F4F6",
                  border: n.active ? `2px solid ${C.primary}` : "none",
                }}
              >
                {n.icon === "flag" && <Flag size={18} color={C.primary} fill={C.primary} />}
                {n.icon === "lock" && <Lock size={16} color="#9CA3AF" />}
                {n.icon === "trophy" && <Trophy size={18} color="#9CA3AF" />}
                {n.active && (
                  <div
                    className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-white text-[11px] font-medium max-w-[80px] truncate"
                    style={{ background: "#111" }}
                  >
                    You are here
                  </div>
                )}
              </div>
              <div
                className="absolute top-1/2 -translate-y-1/2 text-[11px] font-medium text-center leading-tight w-20"
                style={{
                  color: n.active ? C.text : C.muted,
                  [labelLeft ? "right" : "left"]: "calc(100% + 12px)",
                }}
              >
                {n.label}
              </div>
            </div>
          );
        })}
      </div>
      <StickyButton onClick={next}>Continue</StickyButton>
    </StepShell>
  );
}

function S18() {
  const { set, next, answers } = useQuiz();
  return (
    <StepShell>
      <Heading>Would an official AI certification give you an advantage in your career?</Heading>
      <OptionList
        value={answers.certification_value}
        onPick={pickAndNext(set, next, "certification_value")}
        options={[
          { value: "definitely", label: "Definitely - it would set me apart", Icon: ShieldCheck },
          { value: "probably", label: "Probably - it's a growing field", Icon: Smile },
          { value: "no", label: "I don't think certifications matter for me", Icon: Loader },
        ]}
      />
    </StepShell>
  );
}

function S19() {
  const { next, answers } = useQuiz();
  const name = answers.name || "Your Name";
  return (
    <StepShell>
      <div
        className="rounded-2xl p-3 mb-5 mx-auto"
        style={{ background: "#FFF7ED", maxWidth: 320 }}
      >
        <div
          className="rounded-lg bg-white px-4 py-4 text-center relative"
          style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
        >
          <div className="text-[13px] font-extrabold tracking-wide mb-3" style={{ color: "#111" }}>
            CERTIFICATE OF MASTERY
          </div>
          <div className="text-[8px] mb-1" style={{ color: C.muted }}>The certificate was awarded to</div>
          <div
            className="text-[11px] font-semibold tracking-wider pb-1 mx-auto"
            style={{ color: "#111", borderBottom: "1px solid #E5E7EB", maxWidth: 180 }}
          >
            {(name || "Your Name").toUpperCase()}
          </div>
          <div className="text-[7px] leading-snug mt-2 px-3" style={{ color: C.muted }}>
            Has successfully completed the advanced learning path <b>'Claude Master Certification'</b> and demonstrated deep expertise in effectively utilizing and integrating Claude.
          </div>
          <div className="flex justify-center my-2">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[7px] font-bold text-center leading-none"
              style={{
                background: C.primary,
                clipPath:
                  "polygon(50% 0%, 61% 8%, 73% 4%, 79% 15%, 91% 17%, 92% 30%, 100% 38%, 95% 50%, 100% 62%, 92% 70%, 91% 83%, 79% 85%, 73% 96%, 61% 92%, 50% 100%, 39% 92%, 27% 96%, 21% 85%, 9% 83%, 8% 70%, 0% 62%, 5% 50%, 0% 38%, 8% 30%, 9% 17%, 21% 15%, 27% 4%, 39% 8%)",
              }}
            >
              ✓
            </div>
          </div>
          <div className="flex justify-between items-end text-[7px]" style={{ color: C.muted }}>
            <span>7 November 2025</span>
            <span>ID: 342428523</span>
          </div>
        </div>
      </div>
      <Heading>Become a certified Claude master with Appex</Heading>
      <Sub>Don't just learn AI — prove it. Complete the Appex course, pass the certification, and add an official credential to your resume and LinkedIn. In 7 days, you go from "interested in AI" to "certified AI professional."</Sub>
      <GreenCheckList items={[
        "Official Claude mastery certification by Appex",
        "Recognized credential for your resume and LinkedIn",
        "Validates real, practical AI skills — not just theory",
        "Complete in 7 days — 15 minutes per day",
      ]} />
      <StickyButton onClick={next}>Continue</StickyButton>
    </StepShell>
  );
}

function CommitmentModal({
  title, review, onPick,
}: { title: string; review: { name: string; quote: string; sub: string }; onPick: (v: "yes" | "no") => void }) {
  return (
    <div className="relative">
      {/* faux background */}
      <div className="opacity-40 pointer-events-none select-none">
        <div className="rounded-2xl p-4 mb-4" style={{ background: C.card }}>
          <div className="flex justify-between text-[13px] font-semibold mb-2" style={{ color: C.text }}>
            <span>Setting Goals</span><span>50%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: "#E5E7EB" }}>
            <div className="h-full" style={{ background: C.primary, width: "50%" }} />
          </div>
        </div>
        <div className="rounded-2xl p-4 mb-6" style={{ background: "white", border: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-1 mb-1">{"★★★★★".split("").map((s, i) => <span key={i} style={{ color: "#F5B400" }}>{s}</span>)}</div>
          <div className="text-[14px] font-semibold mb-1" style={{ color: C.text }}>{review.name}</div>
          <div className="text-[13px]" style={{ color: C.muted }}>"{review.quote}" {review.sub}</div>
        </div>
      </div>
      {/* modal */}
      <div className="fixed inset-x-0 bottom-0 md:static md:mt-4">
        <div className="absolute inset-0 -top-40 bg-black/40 md:hidden" />
        <div className="relative mx-auto max-w-[440px] bg-white rounded-t-3xl md:rounded-3xl p-6 shadow-2xl" style={{ border: `1px solid ${C.border}` }}>
          <Heading>{title}</Heading>
          <Sub>To move forward, please specify</Sub>
          <div className="flex gap-3">
            <div className="flex-1"><OutlineButton onClick={() => onPick("no")}>No</OutlineButton></div>
            <div className="flex-1"><PrimaryButton onClick={() => onPick("yes")}>Yes</PrimaryButton></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function S20() {
  const { set, next } = useQuiz();
  return (
    <StepShell>
      <CommitmentModal
        title="Are you ready to finally take control of your income?"
        review={{ name: "Emma R. | UK", quote: "Didn't expect much… but it actually works!", sub: "" }}
        onPick={(v) => { set("commit_income", v); next(); }}
      />
    </StepShell>
  );
}

function S21() {
  const { set, next, answers } = useQuiz();
  const timeLabel: Record<string, string> = {
    "10min": "10 min", "20min": "20 min", "30min": "30 min", "1hour": "1 hour",
  };
  const t = timeLabel[answers.daily_time_commitment || ""] || "30 min";
  return (
    <StepShell>
      <CommitmentModal
        title={`Would you commit ${t}/day to learn a high-income skill?`}
        review={{ name: "Carlos M. | California", quote: "Side hustle turned full-time income", sub: "" }}
        onPick={(v) => { set("commit_time", v); next(); }}
      />
    </StepShell>
  );
}

function readinessPct(a: Answers): number {
  switch (a.ai_rework_experience) {
    case "works_well": return 80;
    case "sometimes": return 55;
    case "every_time": return 35;
    case "untried": return 20;
    default: return 30;
  }
}

function personalizedOneLiner(workStatus?: string, careerGoal?: string): string {
  const role = workStatus || "";
  const goal = careerGoal || "";
  if (role === "owner" && goal.includes("business")) return "As a business owner ready to scale with AI, you're set up for fast wins.";
  if (role === "owner") return "As a business owner, Claude can handle the tasks that slow you down every day.";
  if (role === "employee" && goal.includes("promoted")) return "As someone aiming for a promotion, Claude can give you the edge in your next review.";
  if (role === "employee") return "As a full-time employee, Claude can make you the most productive person on your team.";
  if (role === "freelancer" && goal.includes("freelanc")) return "As a freelancer, Claude can help you deliver more work — in less time — at higher rates.";
  if (role === "freelancer") return "As a freelancer, Claude is your 24/7 assistant that never takes a day off.";
  if (role === "switcher") return "As someone switching careers, Claude skills will make you stand out to any employer.";
  if (goal.includes("freelanc")) return "Claude is the fastest path to landing your first paid project.";
  if (goal.includes("remote") || goal.includes("home")) return "Claude makes remote work more productive — and more hireable.";
  return "You're closer to AI mastery than most people realize.";
}

function S22() {
  const { answers, next } = useQuiz();
  const roleLabel: Record<string, string> = {
    employee: "Full-time employee", freelancer: "Freelancer", owner: "Business owner",
    switcher: "Career switcher", exploring: "Exploring options",
  };
  const claudeHelps: Record<string, string> = {
    every_time: "Polishing AI output to sound like you",
    sometimes: "Tackling more complex work",
    works_well: "Scaling beyond basic prompts",
    untried: "Jumpstarting your AI journey",
  };
  const timeLabel: Record<string, string> = {
    "30m-1h": "30 min – 1 hour/day", "1-3h": "1–3 hours/day", "3h+": "3+ hours/day",
  };
  const pct = readinessPct(answers);
  const oneLiner = personalizedOneLiner(answers.work_status, answers.career_goal);

  return (
    <StepShell>
      <Heading>Here's your AI profile</Heading>
      <Sub>Based on your answers, we've created your personal AI readiness assessment.</Sub>
      <p className="text-[14px] font-medium mb-5 -mt-3 leading-snug" style={{ color: '#F97316' }}>{oneLiner}</p>

      <div className="rounded-2xl overflow-hidden mb-5" style={{ background: C.card }}>
        <Row label="Role" value={roleLabel[answers.work_status || ""] || "—"} />
        <Row label="Where Claude helps most" value={claudeHelps[answers.ai_rework_experience || ""] || "Getting things done faster"} />
        <Row label="Growth Potential" value="High" valueColor="#16A34A" />
        <Row label="Time you can reclaim" value={timeLabel[answers.time_lost_files || ""] || "1–3 hours/day"} />
        <Row label="Top opportunity" value="Save 5+ hours/week" valueColor={C.success} />
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-[12px] font-semibold mb-1.5" style={{ color: C.muted }}>
          <span>Beginner</span><span>Intermediate</span><span>Advanced</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "#E5E7EB" }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, #EF4444, #F97316, #EAB308, #22C55E)" }} />
        </div>
        <p className="text-[11px] mt-1 mb-4" style={{ color: C.muted }}>Your AI starting point</p>
      </div>

      <div className="rounded-2xl p-4 mb-3 flex gap-3" style={{ border: '1.5px solid #F97316', background: '#FFF7ED' }}>
        <span className="text-[20px] flex-shrink-0 mt-0.5">✨</span>
        <div className="text-[13px]" style={{ color: C.text }}>
          <span className="font-bold" style={{ color: '#F97316' }}>Big opportunity: </span>
          You're closer to AI mastery than most people realize. With the right Claude skills, you could save 5+ hours a week and unlock new career options within 3 months.
        </div>
      </div>
      <p className="text-[11px] text-center mb-5" style={{ color: C.muted }}>
        Most users who start their plan within 24 hours complete their first Claude workflow in under a week.
      </p>

      <StickyButton onClick={next}>Continue →</StickyButton>
    </StepShell>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-start gap-4 px-4 py-3 border-b last:border-b-0" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
      <span className="text-[13px] flex-shrink-0" style={{ color: C.muted }}>{label}</span>
      <span className="text-[13px] font-semibold text-right" style={{ color: valueColor || C.text }}>{value}</span>
    </div>
  );
}

function S23() {
  const { set, next, answers } = useQuiz();
  const [email, setEmail] = useState(answers.email || "");
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return (
    <StepShell>
      <Heading>
        Enter your email to get your personal <span style={{ color: C.primary }}>Claude Mastery Plan</span>
      </Heading>
      <div className="relative my-5">
        <Mail size={18} color={C.muted} className="absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl pl-11 pr-4 py-4 text-[16px] outline-none"
          style={{ background: "white", border: `1.5px solid ${C.border}`, color: C.text }}
        />
      </div>
      <p className="flex items-start gap-2 text-[12px] mb-4" style={{ color: C.muted }}>
        <Lock size={14} className="mt-0.5 flex-shrink-0" />
        We respect your privacy. See our <a href="/privacy" className="underline ml-1">Privacy Policy</a>.
      </p>
      <div className="rounded-2xl p-3 mb-6 text-[13px]" style={{ background: "rgba(47,79,224,0.08)", color: C.text }}>
        Make sure your email is valid — get the <strong>AI Agents Guidebook</strong> from us.
      </div>
      <PrimaryButton
        disabled={!valid}
        onClick={() => { set("email", email); next(); }}
      >
        Continue
      </PrimaryButton>
    </StepShell>
  );
}

function S24() {
  const { set, next, answers, close } = useQuiz();
  const [name, setName] = useState(answers.name || "");
  const valid = name.trim().length > 0;
  const finish = () => {
    set("name", name.trim());
    next();
  };
  return (
    <StepShell>
      <Heading>What is your name?</Heading>
      <div className="relative my-5">
        <UserIcon size={18} color={C.muted} className="absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          autoComplete="given-name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-2xl pl-11 pr-4 py-4 text-[16px] outline-none"
          style={{ background: "white", border: `1.5px solid ${C.border}`, color: C.text }}
        />
      </div>
      <PrimaryButton disabled={!valid} onClick={finish}>Continue</PrimaryButton>
    </StepShell>
  );
}

function S25() {
  const { answers, close } = useQuiz();
  const navigate = useNavigate();
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
  const go = () => { close(); navigate("/paywall"); };
  return (
    <StepShell>
      <h2 className="text-[28px] font-extrabold leading-tight mb-5" style={{ color: C.text }}>
        Your Personal Plan to Master Claude
      </h2>
      <div className="rounded-2xl px-5 py-4 mb-6 text-center text-white text-[15px] font-medium" style={{ background: C.primary }}>
        AI-skilled professionals earn 25-50% more. You're about to become one of them.
      </div>
      <div className="rounded-2xl p-5 mb-6" style={{ background: "#FFF7ED" }}>
        <h3 className="text-[18px] font-bold mb-1" style={{ color: C.text }}>Become the Master of Claude</h3>
        <p className="text-[14px] mb-4" style={{ color: C.muted }}>4-week guided course + official certification</p>
        <div className="flex flex-col">
          {weeks.map((w, i) => (
            <div key={w.label} className="flex gap-4 py-3" style={{ borderTop: i === 0 ? "none" : "1px solid #D9DEF7" }}>
              <div className="text-[14px] font-semibold shrink-0 w-[64px]" style={{ color: C.primary }}>{w.label}</div>
              <div className="text-[14px] leading-snug" style={{ color: C.text }}>{w.text}</div>
            </div>
          ))}
          <div className="flex gap-3 pt-3" style={{ borderTop: "1px solid #D9DEF7" }}>
            <span className="text-[18px]">🎓</span>
            <div className="text-[14px] leading-snug" style={{ color: C.text }}>
              Certification exam — prove your skills, get certified
            </div>
          </div>
        </div>
      </div>
      <ul className="flex flex-col gap-3 mb-8">
        {bullets.map((b) => (
          <li key={b} className="flex gap-3 items-start text-[15px]" style={{ color: C.text }}>
            <Check size={18} color={C.success} className="mt-0.5 shrink-0" />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <StickyButton onClick={go}>Continue</StickyButton>
    </StepShell>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Overlay                                    */
/* -------------------------------------------------------------------------- */

const LOADING_REVIEWS = [
  { name: "Emma R.", loc: "UK", title: "Didn't expect much… but it actually works!", body: "I set up my first Claude workflow in 3 days. Landed my first client the same week." },
  { name: "Carlos M.", loc: "California, USA", title: "Side hustle turned full-time income", body: "Started just for extra income — now I'm building AI workflows for local businesses." },
  { name: "Sarah T.", loc: "Australia", title: "Zero coding. Real results.", body: "I have zero tech background. Appex made it easy to build things I can actually sell." },
  { name: "James K.", loc: "Canada", title: "Got promoted after 4 weeks", body: "Used Claude skills at work and my manager noticed immediately. Promoted within a month." },
];

function SLoadingFlow() {
  const { set, next, answers } = useQuiz();
  const timeLabel: Record<string, string> = {
    "10min": "10 min", "20min": "20 min", "30min": "30 min", "1hour": "1 hour",
  };
  const t = timeLabel[answers.daily_time_commitment || ""] || "15 min";

  const phases = useMemo(() => ([
    { label: "Setting goals", duration: 2000, popup: { title: "Are you ready to finally take control of your career?", answerKey: "commit_income" as const } },
    { label: "Setting growth areas", duration: 2000, popup: { title: `Would you commit ${t}/day to learn a high-income skill?`, answerKey: "commit_time" as const } },
    { label: "Building your roadmap", duration: 2000, popup: { title: "Do you want us to help you build your first Claude project?", answerKey: "commit_project" as const } },
  ]), [t]);

  const [phaseIdx, setPhaseIdx] = useState(0);
  const [pct, setPct] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [paused, setPaused] = useState(false);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [reviewExiting, setReviewExiting] = useState(false);
  const rafRef = useRef<number>(0);

  // Run bar from 0→50, pause for popup, then 50→100 after answer
  const runBar = (from: number, to: number, dur: number, onDone: () => void) => {
    const start = performance.now();
    const range = to - from;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 2);
      setPct(Math.round(from + eased * range));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
      else onDone();
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    setPct(0);
    setShowPopup(false);
    setPaused(false);
    cancelAnimationFrame(rafRef.current);
    const half = phases[phaseIdx].duration / 2;
    // Run 0→50, then show popup
    runBar(0, 50, half, () => {
      setPaused(true);
      setShowPopup(true);
    });
    return () => cancelAnimationFrame(rafRef.current);
  }, [phaseIdx]);

  useEffect(() => {
    const id = setInterval(() => {
      setReviewExiting(true);
      setTimeout(() => { setReviewIdx((i) => (i + 1) % LOADING_REVIEWS.length); setReviewExiting(false); }, 320);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  const handlePick = (v: "yes" | "no") => {
    const popup = phases[phaseIdx].popup;
    if (popup) set(popup.answerKey as any, v);
    setShowPopup(false);
    setPaused(false);
    // Resume 50→100
    const half = phases[phaseIdx].duration / 2;
    runBar(50, 100, half, () => {
      setTimeout(() => {
        if (phaseIdx < phases.length - 1) setPhaseIdx((i) => i + 1);
        else next();
      }, 300);
    });
  };

  const review = LOADING_REVIEWS[reviewIdx];
  const ORANGE = "#F97316";

  return (
    <StepShell>
      {/* 3 blocks always visible */}
      <div className="flex flex-col gap-3 mb-5">
        {phases.map((ph, i) => {
          const isDone = i < phaseIdx;
          const isActive = i === phaseIdx;
          return (
            <div
              key={ph.label}
              className="rounded-xl border px-4 py-3 transition-all duration-300"
              style={{ borderColor: isDone ? '#111' : '#E5E5E5', background: isDone ? '#111' : '#fff', opacity: i > phaseIdx ? 0.45 : 1 }}
            >
              {isDone ? (
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] flex-shrink-0" style={{ background: '#fff', color: '#111' }}>✓</span>
                  <span className="text-[14px] font-semibold" style={{ color: '#fff' }}>{ph.label}</span>
                </div>
              ) : isActive ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-medium" style={{ color: '#111' }}>{ph.label}</p>
                    <p className="text-[13px] font-semibold tabular-nums" style={{ color: '#111' }}>{pct}%</p>
                  </div>
                  <div className="h-[6px] rounded-full overflow-hidden" style={{ background: '#E5E5E5' }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: ORANGE, transition: 'width 80ms linear' }} />
                  </div>
                </div>
              ) : (
                <p className="text-[13px] font-medium" style={{ color: '#9CA3AF' }}>{ph.label}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Auto-sliding review */}
      <div className="overflow-hidden rounded-xl border" style={{ borderColor: '#E5E5E5' }}>
        <div className="p-4" style={{ transform: reviewExiting ? 'translateX(-40px)' : 'translateX(0)', opacity: reviewExiting ? 0 : 1, transition: 'transform 320ms ease, opacity 320ms ease' }}>
          <div className="flex gap-0.5 mb-1">{"★★★★★".split("").map((s, i) => <span key={i} style={{ color: '#F59E0B', fontSize: 14 }}>{s}</span>)}</div>
          <p className="text-[12px] mb-1" style={{ color: '#9CA3AF' }}>{review.name} | {review.loc}</p>
          <p className="text-[14px] font-semibold mb-1" style={{ color: '#111' }}>{review.title}</p>
          <p className="text-[13px]" style={{ color: '#555' }}>{review.body}</p>
        </div>
      </div>

      {/* Popup — covers everything below the header bar */}
      {showPopup && (
        <div
          className="fixed z-[10000] flex flex-col"
          style={{ inset: 0, background: 'rgba(0,0,0,0.55)' }}
        >
          {/* Transparent spacer that sits over the header — keeps Appex logo visible */}
          <div style={{ height: 88 }} />

          {/* Popup card anchored to bottom of screen */}
          <div className="flex-1 flex items-end sm:items-center justify-center px-4 pb-8 sm:pb-0">
            <div
              className="w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-xl"
              style={{ animation: 'slideUpFade 0.25s ease' }}
            >
              <h3 className="text-[20px] font-bold mb-2 text-center" style={{ color: '#111' }}>
                {phases[phaseIdx].popup.title}
              </h3>
              <p className="text-[13px] text-center mb-6" style={{ color: '#9CA3AF' }}>
                To move forward, please specify
              </p>
              <div className="flex gap-3">
                <button onClick={() => handlePick("no")} className="flex-1 py-3 rounded-full border text-[15px] font-semibold cursor-pointer" style={{ borderColor: '#E5E5E5', background: '#fff', color: '#111' }}>No</button>
                <button onClick={() => handlePick("yes")} className="flex-1 py-3 rounded-full border-none text-[15px] font-semibold cursor-pointer" style={{ background: '#111', color: '#fff' }}>Yes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes slideUpFade { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </StepShell>
  );
}

const CAREER_GOAL_OPTS: Opt[] = [
  { value: "Land a new job", label: "Land a new job" },
  { value: "Get promoted in my current role", label: "Get promoted in my current role" },
  { value: "Start freelancing", label: "Start freelancing" },
  { value: "Work from home / remote", label: "Work from home / remote" },
  { value: "Future-proof my skills before AI changes my job", label: "Future-proof my skills before AI changes my job" },
  { value: "Build my own business", label: "Build my own business" },
];

function SCareerGoal() {
  const { set, next, answers } = useQuiz();
  return (
    <StepShell>
      <Heading>What do you want Claude to help you achieve?</Heading>
      <Sub>Pick the goal that matters most to you right now.</Sub>
      <OptionList
        value={answers.career_goal}
        onPick={(v) => { set("career_goal", v); next(); }}
        options={CAREER_GOAL_OPTS}
      />
    </StepShell>
  );
}

const TIME_HORIZON_OPTS: Opt[] = [
  { value: "In the next 30 days", label: "In the next 30 days" },
  { value: "1–3 months", label: "1–3 months" },
  { value: "3–6 months", label: "3–6 months" },
  { value: "I'm just exploring", label: "I'm just exploring" },
];

function STimeHorizon() {
  const { set, next, answers } = useQuiz();
  return (
    <StepShell>
      <Heading>How soon do you want to see results?</Heading>
      <Sub>We'll tailor your roadmap to your timeline.</Sub>
      <OptionList
        value={answers.time_horizon}
        onPick={(v) => { set("time_horizon", v); next(); }}
        options={TIME_HORIZON_OPTS}
      />
    </StepShell>
  );
}

function chartTargetDate(timeHorizon?: string): { label: string; monthsOut: number } {
  const fmt = (days: number) => {
    const d = new Date(); d.setDate(d.getDate() + days);
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
  };
  if (timeHorizon === "In the next 30 days") return { label: fmt(30), monthsOut: 1 };
  if (timeHorizon === "1–3 months") return { label: fmt(60), monthsOut: 2 };
  if (timeHorizon === "3–6 months") return { label: fmt(120), monthsOut: 4 };
  return { label: fmt(90), monthsOut: 3 };
}

function SGoalCard() {
  const { answers, next } = useQuiz();
  const { label: targetDate, monthsOut } = chartTargetDate(answers.time_horizon);
  const careerGoal = answers.career_goal || "Your goal";
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() + i, 1).toLocaleDateString("en-US", { month: "short" })
  );
  const goalX = 40 + Math.min(monthsOut, 5) * 56;
  const MILESTONES = ["First Claude workflow", "3 workflows built", "Portfolio ready", "Certification earned", "Job-ready"];

  return (
    <StepShell>
      <Heading>Your Personal AI Skill Growth Plan</Heading>
      <p className="text-[14px] mb-3" style={{ color: '#555' }}>
        Based on your goal, you'll be job-ready with Claude by <strong>{targetDate}</strong>
      </p>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="text-[12px]" style={{ color: '#555' }}>Your big goal:</span>
        <span className="px-3 py-1 rounded-full text-[12px] font-semibold border" style={{ borderColor: '#F97316', color: '#F97316' }}>
          {careerGoal}
        </span>
      </div>

      <div className="rounded-2xl border p-3 mb-6 overflow-hidden" style={{ borderColor: '#E5E5E5', background: '#FAFAFA' }}>
        <svg viewBox="0 0 340 185" preserveAspectRatio="xMidYMid meet" className="w-full h-auto block">
          <defs>
            <linearGradient id="growthGradO" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="30%" stopColor="#F97316" />
              <stop offset="60%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
          </defs>
          {MILESTONES.map((_, i) => (
            <line key={i} x1="92" y1={140 - i * 27} x2="328" y2={140 - i * 27} stroke="#F0F0F0" strokeWidth="0.8" />
          ))}
          {MILESTONES.map((label, i) => (
            <text key={label} x="88" y={143 - i * 27} fill="#AAA" fontSize="7.5" textAnchor="end">{label}</text>
          ))}
          {months.map((label, i) => (
            <text key={label} x={40 + i * 56} y="178" fill="#AAA" fontSize="8" textAnchor="middle">{label}</text>
          ))}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line key={i} x1={40 + i * 56} y1="10" x2={40 + i * 56} y2="148" stroke="#F0F0F0" strokeWidth="0.5" />
          ))}
          <path d="M 40 140 Q 96 135 152 115 Q 208 75 264 40 Q 292 25 320 15" fill="none" stroke="url(#growthGradO)" strokeWidth="3" strokeLinecap="round" />
          <line x1={goalX} y1="10" x2={goalX} y2="148" stroke="#111" strokeWidth="1" strokeDasharray="4 3" />
          <rect x={goalX - 38} y="0" width="76" height="16" rx="4" fill="#111" />
          <text x={goalX} y="11" fill="#fff" fontSize="7" textAnchor="middle">Achieving your goal</text>
          <rect x="276" y="8" width="52" height="14" rx="4" fill="#F97316" />
          <text x="302" y="18" fill="#fff" fontSize="7" textAnchor="middle">Your Potential</text>
        </svg>
      </div>

      <button
        type="button"
        onClick={next}
        className="w-full rounded-2xl py-4 text-white font-semibold text-[16px]"
        style={{ background: '#111' }}
      >
        Continue →
      </button>
    </StepShell>
  );
}

const STEPS: Record<number, React.FC> = {
  1: S1, 2: S2, 3: S3, 4: S4, 5: S5, 6: SGender, 7: S6, 8: SRecap, 9: SAiRating,
  10: S7, 11: S8, 12: S9, 13: S10, 14: S11, 15: S12, 16: S13, 17: S14,
  18: SLearnPace, 19: S15, 20: SApproach, 21: SPortfolio, 22: S16,
  23: S17, 24: S18, 25: S19,
  26: SCareerGoal, 27: STimeHorizon, 28: SGoalCard,
  29: SLoadingFlow, 30: S22, 31: S23, 32: S24, 33: S25,
};

export default function QuizOverlay() {
  const { isOpen, step } = useQuiz();

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("overlay-open");
    } else {
      document.body.classList.remove("overlay-open");
    }
    return () => document.body.classList.remove("overlay-open");
  }, [isOpen]);

  if (!isOpen) return null;
  const Step = STEPS[step] || S1;
  return (
    <div
      className="fixed inset-0 bg-white overflow-y-auto"
      style={{ zIndex: 9999, fontFamily: "'Inter', system-ui, sans-serif" }}
      role="dialog"
      aria-modal="true"
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <TopBar />
      <Step key={step} />
    </div>
  );
}

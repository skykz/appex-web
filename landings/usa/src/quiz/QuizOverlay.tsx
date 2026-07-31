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
import { submitLandingQuiz } from "@/lib/landing-api";
import { LegalLink } from "@/components/legal/LegalLink";
import { getQuizMenuLinks } from "@/lib/auth-links";
import { trackLead, trackCompleteRegistration } from "@/lib/meta-pixel";
import { ga4QuizStep, ga4QuizAbandon, ga4Lead, ga4NameSubmit, ga4PlanView } from "@/lib/ga4";
import { pushToDataLayer } from "@/lib/gtm";
import { overlayStepByIndex } from "@/lib/overlay-quiz-steps";
import { checkEmail } from "@/lib/email-validation";
import { trackStepView, installQuizFlushOnExit, setQuizEmail, trackQuizAbandon, registerQuestionText, trackQuizEvent } from "@/lib/quiz-tracker";
import { loadRemoteQuiz } from "@/lib/quiz-content";
import mentorImg from "@/assets/quiz-mentor.jpg";
import skillsCollageImg from "@/assets/quiz-skills-collage.jpg";
import womanIncomeImg from "@/assets/quiz-woman-income.jpg";
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
  const { answers } = useQuiz();
  const menuLinks = getQuizMenuLinks({
    email: answers.email?.trim().toLowerCase(),
  });

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/40 z-[10001]" onClick={onClose} />
      )}
      <div
        className="fixed top-0 right-0 h-full z-[10002] bg-white shadow-2xl transition-transform duration-300 flex flex-col"
        style={{ width: 'min(320px, 85vw)', transform: open ? 'translateX(0)' : 'translateX(100%)' }}
      >
        {/* Header with Docs title + close */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-[22px] font-extrabold tracking-tight" style={{ color: C.text }}>Docs</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-md border bg-transparent cursor-pointer" style={{ borderColor: C.border, color: C.text }} aria-label="Close menu">
            <X size={18} color={C.text} />
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
              className="py-2.5 text-[15px] no-underline transition-colors hover:opacity-70"
              style={{ color: C.text }}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Footer support note */}
        <div className="px-6 pb-8 pt-4 border-t" style={{ borderColor: C.border }}>
          <p className="text-[13px] leading-relaxed" style={{ color: C.muted }}>
            We will be glad to assist you via email. Please send your questions and feedback to{' '}
            <a
              href="mailto:hello@appexme.com"
              className="font-semibold underline underline-offset-2"
              style={{ color: C.text }}
            >
              hello@appexme.com
            </a>
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

/**
 * Step container.
 *
 * On phones the step fills the remaining viewport height and lays its children
 * out in a column, so anything marked `data-quiz-actions` (the answer list or a
 * button row) is pushed to the bottom, within thumb reach, instead of floating
 * mid-screen on a tall device. `flex-1` on the overlay's own flex column is what
 * makes the height work without hardcoding the TopBar's size, which varies with
 * the progress rail.
 *
 * From `md` up the block simply flows from the top, where centring a short step
 * in a wide window already reads fine.
 */
function StepShell({ children }: { children: React.ReactNode }) {
  return (
    // `min-h-*` rather than `flex-1`: flex-1 would cap the step at the container
    // height and clip a long option list without producing a scrollbar. A minimum
    // height still pushes short steps' actions to the bottom, while letting tall
    // ones grow past the fold and scroll normally.
    <div className="mx-auto flex w-full max-w-[520px] flex-col px-5 py-5 animate-[fadeUp_0.35s_ease-out] [min-height:calc(100dvh-var(--quiz-topbar,7rem))] md:block md:min-h-0">
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
    // `mt-auto` is what drops the answers to the bottom of StepShell's column on
    // phones — the question stays put at the top and the tap targets sit under the
    // thumb. Reset at `md`, where the step flows normally.
    <div className="mt-auto flex flex-col gap-3 pt-6 md:mt-0 md:pt-0">
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
      <div className="relative mx-auto mb-6 w-full max-w-[200px] md:max-w-[360px]">
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
              style={{ background: '#FFF7ED', aspectRatio: '16 / 10' }}
            >
              {/* Browser dots */}
              <div className="flex items-center gap-1 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5F57]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#FEBC2E]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#28C840]" />
              </div>
              {/* Claude logo centered */}
              <div className="flex items-center justify-center h-[calc(100%-16px)]">
                <svg viewBox="0 0 100 100" className="w-12 h-12 md:w-20 md:h-20" aria-hidden>
                  {Array.from({ length: 10 }, (_, i) => (
                    <rect key={i} x="46" y="10" width="8" height="34" rx="4" fill="#F97316" transform={`rotate(${i * 36} 50 50)`} />
                  ))}
                </svg>
              </div>
            </div>
          </div>
          {/* Laptop base */}
          <div className="h-2 rounded-b-xl" style={{ background: 'linear-gradient(180deg, #2A2A2A 0%, #1A1A1A 100%)', width: '110%', marginLeft: '-5%' }} />
          <div className="h-0.5 mx-auto rounded-full" style={{ width: '20%', background: '#444', marginTop: '-1px' }} />
        </div>
        {/* Floating lightbulb */}
        <div className="absolute -top-2 -right-3 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-[14px]">💡</div>
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
          <LegalLink href="/terms" className="underline">Terms and Conditions</LegalLink>·
          <LegalLink href="/privacy" className="underline">Privacy Policy</LegalLink>·
          <LegalLink href="/subscription" className="underline">Subscription Terms</LegalLink>
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

/**
 * Illustration for the "polished content" step: a Claude reply that arrives as a
 * finished, formatted document (heading, table, chart) rather than raw text.
 *
 * Drawn in markup instead of shipping a screenshot. The previous asset was an
 * AI-generated mockup whose UI text was garbled ("Extredtent", "Fomnertions",
 * a duplicated "Fix grammar") and used an unrelated purple product chrome — on
 * paid traffic that reads as a fake of someone else's app. This renders real
 * words in the Appex/Claude palette, stays crisp at any density, and costs no
 * image bytes.
 */
function PolishedDocPreview() {
  const CLAUDE_CLAY = "#CC785C";
  const bars = [38, 62, 48, 82, 70];

  return (
    <div
      className="w-full rounded-2xl overflow-hidden mb-6 border"
      style={{ borderColor: C.border, background: "#FFFFFF", maxHeight: 220 }}
      role="img"
      aria-label="Claude turning a prompt into a formatted report with a table and chart"
    >
      {/* Window chrome */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ background: "#FAFAFA", borderColor: C.border }}
      >
        <span className="flex gap-1.5">
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
            <span key={c} className="w-2 h-2 rounded-full" style={{ background: c }} />
          ))}
        </span>
        <span className="ml-1 text-[9px] font-semibold" style={{ color: C.muted }}>
          Claude
        </span>
      </div>

      <div className="flex" style={{ height: 176 }}>
        {/* Left: the ask */}
        <div className="w-[38%] p-2.5 border-r flex flex-col gap-2" style={{ borderColor: C.border }}>
          <div
            className="self-end max-w-[92%] rounded-lg rounded-tr-sm px-2 py-1.5 text-[8px] leading-snug"
            style={{ background: C.primary, color: "#fff" }}
          >
            Turn last quarter's numbers into a client-ready report
          </div>
          <div className="flex items-start gap-1.5">
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(204,120,92,0.15)" }}
            >
              <svg viewBox="0 0 100 100" className="w-2.5 h-2.5">
                {Array.from({ length: 10 }, (_, i) => (
                  <rect key={i} x="46" y="10" width="8" height="34" rx="4" fill={CLAUDE_CLAY}
                    transform={`rotate(${i * 36} 50 50)`} />
                ))}
              </svg>
            </span>
            <div
              className="rounded-lg rounded-tl-sm border px-2 py-1.5 text-[8px] leading-snug"
              style={{ borderColor: C.border, color: C.text }}
            >
              Done — formatted and ready to export.
            </div>
          </div>
          <div className="mt-auto flex items-center gap-1">
            <span className="text-[7px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: "#ECFDF5", color: C.success }}>
              ✓ No reformatting
            </span>
          </div>
        </div>

        {/* Right: the finished artifact */}
        <div className="flex-1 p-2.5" style={{ background: "#FCFCFD" }}>
          <p className="text-[10px] font-extrabold mb-0.5" style={{ color: C.text }}>
            Q3 Performance Report
          </p>
          <p className="text-[7px] mb-2" style={{ color: C.muted }}>
            Revenue up 18% quarter over quarter
          </p>

          {/* Table */}
          <div className="rounded border overflow-hidden mb-2" style={{ borderColor: C.border }}>
            <div className="flex text-[7px] font-bold px-1.5 py-1" style={{ background: "#F3F4F6", color: C.muted }}>
              <span className="flex-1">Channel</span>
              <span className="w-10 text-right">Rev.</span>
              <span className="w-8 text-right">Δ</span>
            </div>
            {[
              ["Organic", "$42.8k", "+12%"],
              ["Paid", "$31.2k", "+24%"],
            ].map(([a, b, c], i) => (
              <div key={a} className="flex text-[7px] px-1.5 py-1"
                style={{ background: i ? "#fff" : "#FDFDFD", color: C.text }}>
                <span className="flex-1">{a}</span>
                <span className="w-10 text-right font-semibold">{b}</span>
                <span className="w-8 text-right font-semibold" style={{ color: C.success }}>{c}</span>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="flex items-end gap-1.5" style={{ height: 44 }}>
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t"
                style={{
                  height: `${h}%`,
                  background: i === bars.length - 1 ? C.primary : "#FED7AA",
                }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function S11() {
  const { next } = useQuiz();
  return (
    <StepShell>
      <PolishedDocPreview />
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
  // The path draws itself, then each node pops in as the line reaches it.
  // Timings are derived from one constant so the rhythm stays in sync if the
  // node count changes.
  const DRAW_MS = 1500;
  const nodeDelay = (i: number) => 120 + (i * DRAW_MS) / nodes.length;

  // Measured on mount so stroke-dasharray matches the real curve length —
  // hardcoding it would leave a gap or a jump on other viewport widths.
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLen, setPathLen] = useState(0);
  useEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength());
  }, []);

  return (
    <StepShell>
      <Heading>Your guided step-by-step plan is almost ready!</Heading>
      <p className="text-[14px] text-center -mt-2 mb-1" style={{ color: C.muted }}>
        You're <span className="font-bold" style={{ color: C.text }}>4 steps</span> from your certification
      </p>
      <div className="relative mx-auto my-4" style={{ width: W, height: H }}>
        <svg width={W} height={H} className="absolute inset-0" style={{ overflow: "visible" }}>
          <path
            ref={pathRef}
            d={pathD}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={6}
            strokeLinecap="round"
            className="motion-reduce:animate-none"
            style={
              pathLen
                ? {
                    strokeDasharray: pathLen,
                    strokeDashoffset: pathLen,
                    animation: `quiz-path-draw ${DRAW_MS}ms ease-out forwards`,
                  }
                : undefined
            }
          />
        </svg>
        {nodes.map((n, i) => {
          const cx = xFor(n.side);
          const cy = yFor(i);
          const labelLeft = n.side === "right";
          return (
            <div
              key={n.label}
              className="absolute motion-reduce:animate-none"
              style={{
                left: cx,
                top: cy,
                transform: "translate(-50%, -50%)",
                opacity: 0,
                animation: `quiz-node-pop 420ms cubic-bezier(0.34, 1.56, 0.64, 1) ${nodeDelay(i)}ms both`,
              }}
            >
              <div
                className="relative w-12 h-12 rounded-full flex items-center justify-center"
                style={{
                  background: n.active ? "#FFF7ED" : "#F3F4F6",
                  border: n.active ? `2px solid ${C.primary}` : "none",
                }}
              >
                {/* Pulsing halo marks the current position without nudging layout */}
                {n.active && (
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full motion-reduce:hidden"
                    style={{
                      border: `2px solid ${C.primary}`,
                      animation: "quiz-node-halo 2s ease-out 1.6s infinite",
                    }}
                  />
                )}
                {n.icon === "flag" && <Flag size={18} color={C.primary} fill={C.primary} />}
                {n.icon === "lock" && <Lock size={16} color="#9CA3AF" />}
                {n.icon === "trophy" && <Trophy size={18} color="#9CA3AF" />}
                {/* Sits above the node, not beside it: the active node's own
                    label already occupies the horizontal slot. */}
                {n.active && (
                  <div
                    className="absolute left-1/2 bottom-full mb-2 px-2.5 py-1 rounded-lg text-white text-[11px] font-semibold whitespace-nowrap motion-reduce:animate-none"
                    style={{
                      background: "#111",
                      opacity: 0,
                      // The node is only 48px wide; without an explicit
                      // max-content width the absolute badge is squeezed to it
                      // and the label wraps to one character per line.
                      width: "max-content",
                      animation: "quiz-badge-pop 320ms cubic-bezier(0.34, 1.56, 0.64, 1) 700ms both",
                    }}
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

  // Readiness bar fills from 0 to `pct` via a CSS keyframe animation rather
  // than a JS-driven transition: the step mounts inside the overlay before it
  // is laid out, and a requestAnimationFrame flip can land in the same paint
  // (or fire while the container is still collapsed), skipping the transition.
  // A keyframe animation always runs once the element is rendered.
  // `motion-reduce:animate-none` below pins it to the final width instead.

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
        <div
          className="h-2.5 rounded-full overflow-hidden"
          style={{ background: "#E5E7EB" }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Your AI starting point"
        >
          <div
            className="h-full rounded-full motion-reduce:animate-none"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(90deg, #EF4444, #F97316, #EAB308, #22C55E)",
              // Grows from 0 to its own width; long ease-out so it decelerates
              // into the final score. `both` holds the end state after it runs.
              transformOrigin: "left center",
              animation: "quiz-readiness-fill 1400ms cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          />
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
  const { set, next, answers, commitAnswer } = useQuiz();
  const [email, setEmail] = useState(answers.email || "");
  // Errors appear only after the visitor leaves the field or tries to submit —
  // validating while they are still typing flags every half-finished address and
  // reads as the form arguing with them.
  const [touched, setTouched] = useState(false);
  const check = checkEmail(email);
  const canSubmit = check.status === "ok" || check.status === "suggest";
  const showError = touched && check.status === "invalid" && email.trim().length > 0;
  /**
   * The button stays enabled once something has been typed, so tapping it can
   * REVEAL the reason. Disabling it instead leaves the visitor with a dead
   * control and no explanation — they can't tell a rejected address from a broken
   * page, and simply leave. The guard lives in the handler, not the disabled prop.
   */
  const buttonDisabled = email.trim().length === 0;

  const submit = (value: string) => {
    set("email", value);
    // Backfills the address onto the ~30 anonymous rows this device already
    // wrote, which is what links a later purchase to the answers behind it.
    setQuizEmail(value);
    // Records that consent was given at this step, with the wording shown. The
    // screen states the guidebook will be emailed, so submitting IS the consent —
    // worth storing as its own fact rather than inferring it later from a lead row.
    trackQuizEvent({
      event_name: "step_answer",
      step_id: "email_consent",
      step_order: 31,
      section: "signup",
      step_type: "milestone",
      answer_label: "granted",
      answer_value: true,
      props: { consent_copy: "AI Agents Guidebook opt-in on email step" },
    });
    commitAnswer("email_capture", "provided");
    trackLead();
    ga4Lead();
    pushToDataLayer("lead");
    void submitLandingQuiz({ email: value, answers: { ...answers, email: value } });
    next();
  };

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
          onBlur={() => setTouched(true)}
          className="w-full rounded-2xl pl-11 pr-4 py-4 text-[16px] outline-none"
          style={{
            background: "white",
            border: `1.5px solid ${showError ? C.warning : C.border}`,
            color: C.text,
          }}
        />
      </div>

      {showError && (
        <p className="text-[13px] mb-3" style={{ color: C.warning }}>
          {check.message}
        </p>
      )}

      {/* A likely typo is offered as a one-tap fix, never enforced — a real
          address that merely looks odd must not be turned away here. */}
      {check.status === "suggest" && (
        <p className="text-[13px] mb-3" style={{ color: C.text }}>
          {check.message}{" "}
          <button
            type="button"
            onClick={() => setEmail(check.suggestion)}
            className="underline font-semibold"
            style={{ color: C.primary }}
          >
            Yes, fix it
          </button>
        </p>
      )}

      <p className="flex items-start gap-2 text-[12px] mb-4" style={{ color: C.muted }}>
        <Lock size={14} className="mt-0.5 flex-shrink-0" />
        We respect your privacy. See our <LegalLink href="/privacy" className="underline ml-1">Privacy Policy</LegalLink>.
      </p>
      <div className="rounded-2xl p-3 mb-6 text-[13px]" style={{ background: "rgba(47,79,224,0.08)", color: C.text }}>
        Make sure your email is valid — get the <strong>AI Agents Guidebook</strong> from us.
      </div>
      <PrimaryButton
        disabled={buttonDisabled}
        onClick={() => {
          // Mark touched FIRST so a rejected address surfaces its message on this
          // very tap, rather than the tap appearing to do nothing.
          setTouched(true);
          if (!canSubmit) return;
          // Normalised before it leaves the client so the address stored, emailed
          // and used for the Stripe customer all match.
          submit(email.trim().toLowerCase());
        }}
      >
        Continue
      </PrimaryButton>
    </StepShell>
  );
}

function S24() {
  const { set, next, answers, close, commitAnswer } = useQuiz();
  const [name, setName] = useState(answers.name || "");
  const valid = name.trim().length > 0;
  const finish = () => {
    const trimmed = name.trim();
    set("name", trimmed);
    // Registration-intent milestone. Don't send the name itself as a param.
    commitAnswer("name_capture", "provided");
    trackCompleteRegistration();
    ga4NameSubmit();
    pushToDataLayer("name_submit");
    void submitLandingQuiz({
      email: answers.email || "",
      name: trimmed,
      answers: { ...answers, name: trimmed },
    });
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

  // plan_view — the personal-plan reveal, last screen before the paywall.
  useEffect(() => {
    ga4PlanView();
    pushToDataLayer("plan_view");
  }, []);

  const weeks = [
    { label: "Week 1", text: "Claude Fundamentals — learn how to communicate with AI and get useful, accurate results" },
    { label: "Week 2", text: "Claude Code Basics — let Claude handle tasks on your computer and automate simple workflows" },
    { label: "Week 3", text: "Building with Claude — create simple tools, pages, and solutions without coding" },
    { label: "Week 4", text: "Real Projects & Automation — apply Claude to real tasks and build things you can actually use" },
  ];
  const bullets = [
    "Recognized credential trusted by hiring teams",
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
      {/* Earnings hook — tinted card instead of a solid orange slab: the big
          number carries the emphasis, so the block stops competing with the
          heading and the body copy stays high-contrast (dark on light). */}
      <div
        className="rounded-2xl px-5 py-4 mb-6 flex items-center gap-4"
        style={{ background: "#FFF7ED", border: "1px solid #FED7AA" }}
      >
        <div className="shrink-0 text-center">
          <div className="text-[26px] font-extrabold leading-none" style={{ color: C.primary }}>
            25–50%
          </div>
          <div className="text-[10px] font-bold uppercase tracking-wide mt-1" style={{ color: C.primary }}>
            more pay
          </div>
        </div>
        <div className="w-px self-stretch" style={{ background: "#FED7AA" }} />
        <p className="text-[14px] leading-snug" style={{ color: C.text }}>
          That's what AI-skilled professionals earn.{" "}
          <span className="font-bold">You're about to become one of them.</span>
        </p>
      </div>
      <div className="rounded-2xl p-5 mb-6" style={{ background: "#FFF7ED" }}>
        <h3 className="text-[18px] font-bold mb-1" style={{ color: C.text }}>Become the Master of Claude</h3>
        <p className="text-[14px] mb-4" style={{ color: C.muted }}>4-week guided course + official certification</p>
        <div className="flex flex-col">
          {weeks.map((w, i) => (
            <div key={w.label} className="flex gap-4 py-3" style={{ borderTop: i === 0 ? "none" : "1px solid #FED7AA" }}>
              <div className="text-[14px] font-semibold shrink-0 w-[64px]" style={{ color: C.primary }}>{w.label}</div>
              <div className="text-[14px] leading-snug" style={{ color: C.text }}>{w.text}</div>
            </div>
          ))}
          <div className="flex gap-3 pt-3" style={{ borderTop: "1px solid #FED7AA" }}>
            <span className="text-[18px]">🎓</span>
            <div className="text-[14px] leading-snug" style={{ color: C.text }}>
              Certification exam — prove your skills, get certified
            </div>
          </div>
          {/* Outcome step: what the certificate + portfolio are FOR. Deliberately
              worded as a result of the course, not as a job board feature —
              Appex has no listings, and promising one would be unfulfillable. */}
          <div className="flex gap-3 pt-3" style={{ borderTop: "1px solid #FED7AA" }}>
            <span className="text-[18px]">🎯</span>
            <div className="text-[14px] leading-snug" style={{ color: C.text }}>
              Land the work — use your certificate and portfolio to apply for AI roles and win freelance clients
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
  /**
   * Index of the phase that just hit 100%, or null. Distinguishes "completed a
   * moment ago" (play the sweep/sparks once) from "was already done" (steady
   * dark card) — without it every re-render would replay the celebration.
   */
  const [justDone, setJustDone] = useState<number | null>(null);

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
    // The previous phase's celebration is over once we advance; clearing it lets
    // that card settle into its plain completed state.
    setJustDone(null);
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
    const completing = phaseIdx;
    runBar(50, 100, half, () => {
      // Celebrate the completed phase, then advance. The delay is longer than
      // the old 300ms so the sweep/sparks are actually seen before the card
      // becomes a plain "done" row.
      setJustDone(completing);
      setTimeout(() => {
        if (phaseIdx < phases.length - 1) setPhaseIdx((i) => i + 1);
        else next();
      }, 900);
    });
  };

  const review = LOADING_REVIEWS[reviewIdx];
  const ORANGE = "#F97316";

  return (
    <StepShell>
      {/* 3 blocks always visible */}
      <div className="flex flex-col gap-3 mb-5">
        {phases.map((ph, i) => {
          // A phase counts as done once it's behind us, or the instant its bar
          // fills — `justDone` keeps the card dark through the celebration
          // instead of snapping back to white before the index advances.
          const isDone = i < phaseIdx || justDone === i;
          const celebrating = justDone === i;
          const isActive = i === phaseIdx && !celebrating;
          return (
            <div
              key={ph.label}
              className={`relative overflow-hidden rounded-xl border px-4 py-3 transition-all duration-500${celebrating ? ' quiz-phase-land' : ''}`}
              style={{
                borderColor: isDone ? '#111' : '#E5E5E5',
                // Gradient rather than flat #111 — the completed card gets depth
                // and a faint brand-warm cast instead of reading as a dead block.
                background: isDone
                  ? 'linear-gradient(135deg, #1C1917 0%, #111 45%, #201A16 100%)'
                  : '#fff',
                opacity: i > phaseIdx ? 0.45 : 1,
                boxShadow: celebrating ? '0 8px 24px -8px rgba(249,115,22,0.45)' : 'none',
                animationDuration: celebrating ? '620ms' : undefined,
                animationTimingFunction: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
              }}
            >
              {/* One-shot light sweep + ring, only on the phase that just landed. */}
              {celebrating && (
                <>
                  <span
                    aria-hidden
                    className="quiz-phase-sweep pointer-events-none absolute inset-y-0 left-0 w-1/3"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.35), rgba(255,255,255,0.25), transparent)',
                      animation: 'quiz-phase-sweep 900ms ease-out',
                    }}
                  />
                  <span
                    aria-hidden
                    className="quiz-phase-ring pointer-events-none absolute inset-0 rounded-xl"
                    style={{
                      border: `1.5px solid ${ORANGE}`,
                      animation: 'quiz-phase-ring 700ms ease-out forwards',
                    }}
                  />
                </>
              )}

              {isDone ? (
                <div className="relative flex items-center gap-3">
                  <span
                    className={`relative w-5 h-5 rounded-full flex items-center justify-center text-[11px] flex-shrink-0${celebrating ? ' quiz-phase-check' : ''}`}
                    style={{
                      background: '#fff',
                      color: '#111',
                      animation: celebrating ? 'quiz-phase-check 520ms cubic-bezier(0.34, 1.56, 0.64, 1)' : undefined,
                      boxShadow: celebrating ? `0 0 0 4px rgba(249,115,22,0.28)` : 'none',
                    }}
                  >
                    ✓
                    {/* Sparks flung out of the badge — pure decoration. */}
                    {celebrating &&
                      [
                        { x: '-14px', y: '-11px' }, { x: '13px', y: '-12px' },
                        { x: '-15px', y: '10px' },  { x: '15px', y: '9px' },
                        { x: '0px', y: '-16px' },   { x: '1px', y: '15px' },
                      ].map((s, si) => (
                        <span
                          key={si}
                          aria-hidden
                          className="quiz-phase-spark pointer-events-none absolute rounded-full"
                          style={{
                            width: 3,
                            height: 3,
                            background: si % 2 ? '#FDBA74' : ORANGE,
                            ['--spark-x' as string]: s.x,
                            ['--spark-y' as string]: s.y,
                            animation: `quiz-phase-spark 620ms ease-out ${si * 22}ms forwards`,
                          }}
                        />
                      ))}
                  </span>
                  <span className="text-[14px] font-semibold" style={{ color: '#fff' }}>{ph.label}</span>
                </div>
              ) : isActive ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[13px] font-medium" style={{ color: '#111' }}>{ph.label}</p>
                    <p className="text-[13px] font-semibold tabular-nums" style={{ color: '#111' }}>{pct}%</p>
                  </div>
                  <div className="h-[6px] rounded-full overflow-hidden" style={{ background: '#E5E5E5' }}>
                    <div
                      className="relative h-full rounded-full overflow-hidden"
                      style={{
                        width: `${pct}%`,
                        // Warm gradient + glow so the fill looks energised rather
                        // than like a flat progress block.
                        background: `linear-gradient(90deg, #FB923C 0%, ${ORANGE} 60%, #EA580C 100%)`,
                        boxShadow: '0 0 8px rgba(249,115,22,0.55)',
                        transition: 'width 80ms linear',
                      }}
                    >
                      {/* Sheen travelling along the filled portion while it grows. */}
                      <span
                        aria-hidden
                        className="quiz-bar-shine absolute inset-y-0 w-1/2"
                        style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent)',
                          animation: 'quiz-bar-shine 1.1s linear infinite',
                        }}
                      />
                    </div>
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

/** The growth curve path, shared by the render and the dot's motion track. */
const GROWTH_CURVE = "M 40 140 Q 96 135 152 115 Q 208 75 264 40 Q 292 25 320 15";
/** How long the curve takes to draw itself, in ms. */
const GROWTH_DRAW_MS = 1600;

function SGoalCard() {
  const { answers, next } = useQuiz();
  const { label: targetDate, monthsOut } = chartTargetDate(answers.time_horizon);
  const careerGoal = answers.career_goal || "Your goal";
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() + i, 1).toLocaleDateString("en-US", { month: "short" })
  );
  const goalX = 40 + Math.min(monthsOut, 5) * 56;
  // The 76-wide label pill is centred on the line but clamped to the 340-wide
  // canvas: at the longest horizon goalX is 320, which would push the pill
  // off-canvas and on top of the "Your Potential" badge.
  const goalLabelX = Math.min(goalX, 340 - 38 - 2);
  const MILESTONES = ["First Claude workflow", "3 workflows built", "Portfolio ready", "Certification earned", "Job-ready"];

  // Animate the chart on entry: the curve draws itself, milestones light up as it
  // climbs past them, and the payoff labels land last. Honours reduced-motion.
  const curveRef = useRef<SVGPathElement>(null);
  const [curveLen, setCurveLen] = useState<number | null>(null);
  const [drawn, setDrawn] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const path = curveRef.current;
    if (!path) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduceMotion(true);
      return;
    }
    // Measured from the real path so the dash sweep matches its true length —
    // a hardcoded value would leave a gap or overshoot if the curve is edited.
    const len = path.getTotalLength();
    setCurveLen(len);

    // Hold the curve undrawn until the step is actually on screen. The step
    // mounts behind its own fade-in (opacity: 0), so starting the reveal at mount
    // would play it while invisible and the learner would only ever see the
    // finished chart — the whole animation would be wasted.
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);

    let anim: Animation | null = null;
    const start = () => {
      if (anim) return;
      anim = path.animate(
        [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
        { duration: GROWTH_DRAW_MS, easing: "cubic-bezier(0.33, 0.9, 0.3, 1)", fill: "forwards" }
      );
      // Start the staged label reveals on the same clock as the curve, so
      // milestones light up mid-climb instead of bunching up at the end.
      setDrawn(true);
    };

    // IntersectionObserver reports visibility, which covers both the fade-in and
    // the case where the chart sits below the fold on a short viewport.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          start();
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(path);
    // Safety net: if the observer never fires (odd layout, zero-size SVG), draw
    // the chart anyway rather than leaving an invisible curve on screen forever.
    const fallback = window.setTimeout(start, 1200);

    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
      anim?.cancel();
    };
  }, []);

  // Until measured (or when reduced motion is on) render the finished chart.
  const animate = !reduceMotion && curveLen !== null;
  const shown = !animate || drawn;

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
          {/* Milestones brighten bottom-up in step with the climb, so each one
              reads as "unlocked" the moment the curve passes it. */}
          {MILESTONES.map((label, i) => (
            <text
              key={label} x="88" y={143 - i * 27} fill="#AAA" fontSize="7.5" textAnchor="end"
              style={animate ? {
                opacity: shown ? 1 : 0.25,
                transition: `opacity 400ms ease ${(i / MILESTONES.length) * GROWTH_DRAW_MS}ms`,
              } : undefined}
            >{label}</text>
          ))}
          {months.map((label, i) => (
            <text key={label} x={40 + i * 56} y="178" fill="#AAA" fontSize="8" textAnchor="middle">{label}</text>
          ))}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line key={i} x1={40 + i * 56} y1="10" x2={40 + i * 56} y2="148" stroke="#F0F0F0" strokeWidth="0.5" />
          ))}
          {/* The curve draws itself left to right via a dash-offset sweep.
              Its dash styles are driven imperatively from the effect above (see
              the batching note there) — deliberately NOT set here, so a later
              re-render can't overwrite the in-flight transition. */}
          <path
            ref={curveRef}
            d={GROWTH_CURVE}
            fill="none" stroke="url(#growthGradO)" strokeWidth="3" strokeLinecap="round"
          />

          {/* A dot rides the head of the curve, then fades as it arrives. */}
          {animate && (
            <circle r="4" fill="#22C55E" stroke="#fff" strokeWidth="1.5"
              opacity={shown ? 0 : 1}
              style={{ transition: `opacity 300ms ease ${GROWTH_DRAW_MS - 250}ms` }}>
              <animateMotion dur={`${GROWTH_DRAW_MS}ms`} fill="freeze" path={GROWTH_CURVE}
                calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines="0.33 0.9 0.3 1" />
            </circle>
          )}

          {/* Goal marker fades in as the curve reaches it. */}
          <g style={animate ? {
            opacity: shown ? 1 : 0,
            transition: `opacity 400ms ease ${GROWTH_DRAW_MS * 0.45}ms`,
          } : undefined}>
            <line x1={goalX} y1="38" x2={goalX} y2="148" stroke="#111" strokeWidth="1" strokeDasharray="4 3" />
            <rect x={goalLabelX - 38} y="0" width="76" height="16" rx="4" fill="#111" />
            <text x={goalLabelX} y="11" fill="#fff" fontSize="7" textAnchor="middle">Achieving your goal</text>
          </g>

          {/* "Your Potential" lands last — the payoff of the climb. */}
          <g style={animate ? {
            opacity: shown ? 1 : 0,
            transform: shown ? 'scale(1)' : 'scale(0.8)',
            transformOrigin: '302px 27px',
            transition: `opacity 350ms ease ${GROWTH_DRAW_MS - 150}ms, transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1) ${GROWTH_DRAW_MS - 150}ms`,
          } : undefined}>
            {/* Own row below the goal pill — both crowd the top-right corner
                at long time horizons. */}
            <rect x="276" y="20" width="52" height="14" rx="4" fill="#F97316" />
            <text x="302" y="30" fill="#fff" fontSize="7" textAnchor="middle">Your Potential</text>
          </g>
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
  const { isOpen, step, answers } = useQuiz();

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("overlay-open");
    } else {
      document.body.classList.remove("overlay-open");
    }
    return () => document.body.classList.remove("overlay-open");
  }, [isOpen]);

  // quiz_step on every screen view — the drop-off funnel signal for the overlay
  // quiz (build the funnel by descending step_index). Only while open, so
  // closing and reopening doesn't emit a step for a hidden overlay.
  useEffect(() => {
    if (!isOpen) return;
    const meta = overlayStepByIndex(step);
    ga4QuizStep({
      step_index: step,
      step_id: meta.id,
      section: meta.section,
      type: meta.type,
    });
    pushToDataLayer("quiz_step", {
      step_index: step,
      step_id: meta.id,
      section: meta.section,
      type: meta.type,
    });
    // Our own store, keyed by anon_id: GA4 gives counts, this gives the raw rows
    // that can be joined to purchases and read for abandoned sessions.
    trackStepView({
      step_order: step,
      step_id: meta.id,
      section: meta.section,
      step_type: meta.type,
    });
  }, [isOpen, step]);

  // Deliver anything still buffered when the tab is hidden — the last screen
  // before leaving is precisely the one worth knowing about.
  useEffect(() => installQuizFlushOnExit(), []);

  /**
   * Pulls published quiz content and registers the question wording, so every
   * recorded answer carries the text the visitor actually read rather than a
   * bare key. Purely additive: the screens still render from code, and a failed
   * or empty response simply leaves the wording unregistered.
   */
  useEffect(() => {
    let cancelled = false;
    void loadRemoteQuiz("usa").then((quiz) => {
      if (cancelled || !quiz) return;
      registerQuestionText(quiz.steps);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /* ── Abandonment tracking ────────────────────────────────────────────────
     quiz_step shows where visitors stop *appearing*, which conflates "left
     here" with "still on this screen". These refs + the exit listener below
     report the actual exit and how long it took, so the last screen someone
     saw can be told apart from the screen that lost them. */
  const stepEnteredAt = useRef<number>(Date.now());
  const quizStartedAt = useRef<number>(Date.now());
  // Guards against double-reporting: a visitor can background the tab, come
  // back, and background it again — that is one abandonment, not two.
  const abandonFired = useRef(false);

  useEffect(() => {
    stepEnteredAt.current = Date.now();
    // Returning to a step after a previous exit means they did NOT abandon, so
    // allow a fresh report if they leave again later.
    abandonFired.current = false;
  }, [step]);

  useEffect(() => {
    if (!isOpen) return;

    const report = (reason: string) => {
      if (abandonFired.current) return;
      // Finishing the quiz is not abandonment — quiz_complete covers that.
      if (step >= TOTAL_STEPS) return;
      abandonFired.current = true;
      const meta = overlayStepByIndex(step);
      const payload = {
        step_index: step,
        step_id: meta.id,
        section: meta.section,
        type: meta.type,
        seconds_on_step: Math.round((Date.now() - stepEnteredAt.current) / 1000),
        seconds_in_quiz: Math.round((Date.now() - quizStartedAt.current) / 1000),
        // How many questions they actually answered before leaving — a visitor
        // who answered 15 and stalled is a different problem from one who
        // answered none.
        answered_count: Object.values(answers).filter(
          (v) => v !== undefined && v !== null && v !== ""
        ).length,
      };
      ga4QuizAbandon(payload);
      pushToDataLayer("quiz_abandon", { ...payload, reason });
      // Same event into our own store, flushed via sendBeacon so it survives the
      // unload that triggered it.
      trackQuizAbandon({
        step_order: step,
        step_id: meta.id,
        section: meta.section,
        step_type: meta.type,
        answered_count: payload.answered_count,
      });
    };

    // visibilitychange (not beforeunload): it is the only one that fires
    // reliably on mobile Safari, and it still leaves time for the request.
    const onHidden = () => {
      if (document.visibilityState === "hidden") report("tab_hidden");
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [isOpen, step, answers]);

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

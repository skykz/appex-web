import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { trackQuizStart, trackQuizComplete } from "@/lib/meta-pixel";
import { ga4QuizStart, ga4QuizComplete, ga4QuizAnswer, ga4CtaClick } from "@/lib/ga4";
import { pushToDataLayer } from "@/lib/gtm";
import { overlayStepByIndex } from "@/lib/overlay-quiz-steps";
import { trackStepAnswer, getQuestionText } from "@/lib/quiz-tracker";

export type Answers = {
  experience_with_claude?: "yes" | "no";
  learning_intent?: "work" | "personal" | "growth";
  work_status?: "employee" | "freelancer" | "owner" | "switcher" | "exploring";
  age_band?: "18-24" | "25-34" | "35-44" | "45-54" | "55+";
  gender?: "female" | "male" | "skip";
  main_goal?: "promotion" | "faster" | "confidence" | "business" | "earn_more";
  primary_fear?: "replaced" | "behind" | "opportunities" | "none";
  ai_experience_rating?: "great" | "good" | "frustrating" | "untried";
  learning_pace?: "own_pace" | "deadlines";
  time_lost_files?: "30m-1h" | "1-3h" | "3h+";
  ai_rework_experience?: "every_time" | "sometimes" | "works_well" | "untried";
  had_unbuilt_idea?: "yes" | "no";
  belief_no_code?: "unlikely" | "skeptical" | "seen_it";
  daily_time_commitment?: "10min" | "20min" | "30min" | "1hour";
  learning_approach?: "theory_practice" | "practice_theory";
  include_portfolio?: "yes" | "no";
  wants_mentor?: "yes" | "no";
  certification_value?: "definitely" | "probably" | "no";
  commit_income?: "yes" | "no";
  commit_time?: "yes" | "no";
  career_goal?: string;
  time_horizon?: string;
  email?: string;
  name?: string;
};

type State = { step: number; answers: Answers };
type Action =
  | { type: "SET"; key: keyof Answers; value: any }
  | { type: "NEXT" }
  | { type: "PREV" }
  | { type: "GOTO"; step: number }
  | { type: "RESET_STEP" };

export const TOTAL_STEPS = 33;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET":
      return { ...state, answers: { ...state.answers, [action.key]: action.value } };
    case "NEXT":
      return { ...state, step: Math.min(state.step + 1, TOTAL_STEPS) };
    case "PREV":
      return { ...state, step: Math.max(state.step - 1, 1) };
    case "GOTO":
      return { ...state, step: action.step };
    case "RESET_STEP":
      return { ...state, step: 1 };
    default:
      return state;
  }
}

interface Ctx {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  step: number;
  answers: Answers;
  set: <K extends keyof Answers>(key: K, value: Answers[K]) => void;
  /** Emits quiz_answer for a committed answer — used by free-text screens
   * (email/name), which call `set` per keystroke and so skip auto-firing. */
  commitAnswer: (key: string, value: unknown) => void;
  next: () => void;
  prev: () => void;
  goto: (n: number) => void;
}

const QuizCtx = createContext<Ctx | null>(null);

/**
 * Answer keys typed into free-text inputs (fired per keystroke by `set`), so they
 * emit quiz_answer once on commit instead of once per character.
 */
const FREE_TEXT_KEYS = new Set<string>(["email", "name"]);

export function QuizProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, dispatch] = useReducer(reducer, { step: 1, answers: {} });

  // Fire quiz_start / quiz_complete once each, persisted so a reload mid-funnel
  // doesn't re-count them (mirrors the /quiz route's guards).
  const quizStartFired = useRef<boolean>(
    typeof sessionStorage !== "undefined" && sessionStorage.getItem("appexOverlayStartFired") === "1"
  );
  const quizCompleteFired = useRef<boolean>(
    typeof sessionStorage !== "undefined" && sessionStorage.getItem("appexOverlayCompleteFired") === "1"
  );

  const open = useCallback(() => {
    dispatch({ type: "RESET_STEP" });
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  /** Emits quiz_answer for a committed answer. The overlay's answer keys are
   * already clean slugs (work_status, age_band, …) so they double as step_id. */
  // Read through a ref so commitAnswer can stay dependency-free: rebuilding it
  // on every step change would re-run each screen's effects.
  const stepRef = useRef(state.step);
  stepRef.current = state.step;

  const commitAnswer = useCallback((key: string, value: unknown) => {
    ga4QuizAnswer({ step_id: key, answer: value });
    pushToDataLayer("quiz_answer", { step_id: key, answer: value });
    // Mirror into our own store. The step meta comes from the shared taxonomy so
    // an answer row carries the same step_id/section as its step_view row.
    const stepNo = stepRef.current;
    const meta = overlayStepByIndex(stepNo);
    trackStepAnswer({
      step_order: stepNo,
      step_id: meta.id,
      section: meta.section,
      step_type: meta.type,
      // The answer key is recorded separately from the screen id: on screens
      // that collect several fields they differ, and the key is what identifies
      // the actual question answered.
      answer_label: typeof value === "string" ? value : undefined,
      answer_value: value,
      // Real wording when the published content provides it; otherwise the
      // answer key, which still identifies the question unambiguously.
      question_text: getQuestionText(meta.id) ?? key,
    });
  }, []);

  /** Fires quiz_start on the very first answer (Meta + GA4 + dataLayer). */
  const fireQuizStartOnce = useCallback(() => {
    if (quizStartFired.current) return;
    quizStartFired.current = true;
    try {
      sessionStorage.setItem("appexOverlayStartFired", "1");
    } catch {
      /* storage disabled — in-memory guard still holds for this page life */
    }
    trackQuizStart();
    ga4QuizStart();
    pushToDataLayer("quiz_start");
  }, []);

  // quiz_complete when the last overlay step is reached.
  useEffect(() => {
    if (quizCompleteFired.current || state.step < TOTAL_STEPS) return;
    quizCompleteFired.current = true;
    try {
      sessionStorage.setItem("appexOverlayCompleteFired", "1");
    } catch {
      /* non-fatal */
    }
    trackQuizComplete();
    ga4QuizComplete();
    pushToDataLayer("quiz_complete");
  }, [state.step]);

  // Persist answers to sessionStorage whenever answers change (for paywall personalization)
  useEffect(() => {
    if (Object.keys(state.answers).length > 0) {
      sessionStorage.setItem("appexQuiz", JSON.stringify({ answers: state.answers }));
    }
  }, [state.answers]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Intercept clicks on links to /quiz across the site
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest?.("a[href='/quiz'], a[href='/quiz/']") as HTMLAnchorElement | null;
      if (!target) return;
      // Report the click here rather than on each button: every landing CTA is an
      // <a href="/quiz"> funnelled through this one listener, so new CTAs are
      // tracked automatically instead of being forgotten. `data-cta` names the
      // section — it tells apart "nobody clicks" (weak copy) from "people click
      // but the quiz never starts" (broken), which look identical in quiz_step.
      const location = target.dataset.cta || "unknown";
      ga4CtaClick({ location });
      pushToDataLayer("cta_click", { location });
      e.preventDefault();
      open();
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  const value = useMemo<Ctx>(() => ({
    isOpen,
    open,
    close,
    step: state.step,
    answers: state.answers,
    set: (k, v) => {
      fireQuizStartOnce();
      // Free-text keys are set per keystroke — those screens call commitAnswer
      // once from their own submit handler instead.
      if (!FREE_TEXT_KEYS.has(k as string)) commitAnswer(k as string, v);
      dispatch({ type: "SET", key: k, value: v });
    },
    commitAnswer,
    next: () => dispatch({ type: "NEXT" }),
    prev: () => dispatch({ type: "PREV" }),
    goto: (n) => dispatch({ type: "GOTO", step: n }),
  }), [isOpen, open, close, state, fireQuizStartOnce, commitAnswer]);

  return <QuizCtx.Provider value={value}>{children}</QuizCtx.Provider>;
}

export function useQuiz() {
  const ctx = useContext(QuizCtx);
  if (!ctx) throw new Error("useQuiz must be used within QuizProvider");
  return ctx;
}

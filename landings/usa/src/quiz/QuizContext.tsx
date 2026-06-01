import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";

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
  next: () => void;
  prev: () => void;
  goto: (n: number) => void;
}

const QuizCtx = createContext<Ctx | null>(null);

export function QuizProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, dispatch] = useReducer(reducer, { step: 1, answers: {} });

  const open = useCallback(() => {
    dispatch({ type: "RESET_STEP" });
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

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
    set: (k, v) => dispatch({ type: "SET", key: k, value: v }),
    next: () => dispatch({ type: "NEXT" }),
    prev: () => dispatch({ type: "PREV" }),
    goto: (n) => dispatch({ type: "GOTO", step: n }),
  }), [isOpen, open, close, state]);

  return <QuizCtx.Provider value={value}>{children}</QuizCtx.Provider>;
}

export function useQuiz() {
  const ctx = useContext(QuizCtx);
  if (!ctx) throw new Error("useQuiz must be used within QuizProvider");
  return ctx;
}

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { trackQuizStart, trackQuizComplete } from "@/lib/meta-pixel";
import { ga4QuizStart, ga4QuizComplete, ga4QuizAnswer } from "@/lib/ga4";
import { pushToDataLayer } from "@/lib/gtm";
import { stepIdForAnswerKey } from "@/lib/quiz-steps";

export interface QuizAnswers {
  gender: string;
  age: string;
  goal: string;
  describe: string;
  challenges: string[];
  experience: string;
  stoppingYou: string;
  aiFeeling: number;
  frustration: number;
  codingExperience: string;
  financialSatisfaction: string;
  extraIncomeThinking: string;
  incomeGoal: string;
  workEnvironment: string;
  currentHours: string;
  preferredHours: string;
  socialMediaHours: string;
  excitingAboutAI: string;
  aiToolsFamiliar: string[];
  freeAccessKnowledge: string;
  tryTechSkill: string;
  aiAutomationKnowledge: string;
  findingClients: string;
  priceFeeling: string;
  reasonForMoney: string;
  goalAmount: string;
  goalTime: string;
  career_goal: string;
  time_horizon: string;
  email: string;
  userName: string;
  [key: string]: any;
}

interface QuizContextType {
  answers: QuizAnswers;
  currentStep: number;
  totalSteps: number;
  maxReachedStep: number;
  setAnswer: (key: keyof QuizAnswers, value: any) => void;
  /**
   * Emits the quiz_answer analytics event for a committed answer. Only needed by
   * free-text screens (email/name/price), which call setAnswer per keystroke and
   * so are excluded from automatic firing — call this once on continue.
   */
  commitAnswer: (key: keyof QuizAnswers, value: any) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (n: number) => void;
}

const defaultAnswers: QuizAnswers = {
  gender: "",
  age: "",
  goal: "",
  describe: "",
  challenges: [],
  experience: "",
  stoppingYou: "",
  aiFeeling: 0,
  frustration: 0,
  codingExperience: "",
  financialSatisfaction: "",
  extraIncomeThinking: "",
  incomeGoal: "",
  workEnvironment: "",
  currentHours: "",
  preferredHours: "",
  socialMediaHours: "",
  excitingAboutAI: "",
  aiToolsFamiliar: [],
  freeAccessKnowledge: "",
  tryTechSkill: "",
  aiAutomationKnowledge: "",
  findingClients: "",
  priceFeeling: "",
  reasonForMoney: "",
  goalAmount: "",
  goalTime: "",
  career_goal: "",
  time_horizon: "",
  email: "",
  userName: "",
};

const QuizContext = createContext<QuizContextType | null>(null);

export const TOTAL_STEPS = 45;

/**
 * Answer keys backed by free-text inputs, which fire setAnswer on EVERY keystroke.
 * Excluded from automatic quiz_answer emission so a typed email doesn't produce
 * one event per character (with partial values). These screens call
 * `commitAnswer` from their continue handler instead.
 */
const FREE_TEXT_KEYS = new Set<string>(["email", "userName", "priceFeeling"]);

export function QuizProvider({ children }: { children: React.ReactNode }) {
  const [answers, setAnswers] = useState<QuizAnswers>(() => {
    try {
      const saved = sessionStorage.getItem("appexQuiz");
      if (saved) return { ...defaultAnswers, ...JSON.parse(saved).answers };
    } catch {}
    return defaultAnswers;
  });

  const [currentStep, setCurrentStep] = useState(() => {
    try {
      const saved = sessionStorage.getItem("appexQuiz");
      if (saved) return JSON.parse(saved).currentStep || 1;
    } catch {}
    return 1;
  });

  const [maxReachedStep, setMaxReachedStep] = useState(currentStep);

  // Fire QuizStart once (first answer) and QuizComplete once (reached last step).
  // The guard is persisted in sessionStorage so a reload/back-nav deep in the
  // funnel (currentStep restored from storage) does not re-fire the event.
  const quizStartFired = useRef<boolean>(sessionStorage.getItem("appexQuizStartFired") === "1");
  const quizCompleteFired = useRef<boolean>(sessionStorage.getItem("appexQuizCompleteFired") === "1");

  useEffect(() => {
    sessionStorage.setItem("appexQuiz", JSON.stringify({ answers, currentStep }));
  }, [answers, currentStep]);

  useEffect(() => {
    if (currentStep > maxReachedStep) setMaxReachedStep(currentStep);
  }, [currentStep, maxReachedStep]);

  useEffect(() => {
    if (!quizCompleteFired.current && currentStep >= TOTAL_STEPS) {
      quizCompleteFired.current = true;
      sessionStorage.setItem("appexQuizCompleteFired", "1");
      trackQuizComplete();
      ga4QuizComplete();
      pushToDataLayer("quiz_complete");
    }
  }, [currentStep]);

  /**
   * Emits quiz_answer for a COMMITTED answer. Kept separate from setAnswer so
   * free-text fields (which call setAnswer on every keystroke) don't spam one
   * event per character — those call commitAnswer once, on continue.
   */
  const commitAnswer = useCallback((key: keyof QuizAnswers, value: any) => {
    const stepId = stepIdForAnswerKey(key as string);
    if (!stepId) return;
    ga4QuizAnswer({ step_id: stepId, answer: value });
    pushToDataLayer("quiz_answer", { step_id: stepId, answer: value });
  }, []);

  const setAnswer = useCallback(
    (key: keyof QuizAnswers, value: any) => {
      if (!quizStartFired.current) {
        quizStartFired.current = true;
        sessionStorage.setItem("appexQuizStartFired", "1");
        trackQuizStart();
        ga4QuizStart();
        pushToDataLayer("quiz_start");
      }
      // Option-based screens commit immediately (one click = one answer).
      // FREE_TEXT_KEYS are typed character-by-character, so they emit
      // quiz_answer from their own "continue" handler via commitAnswer instead.
      if (!FREE_TEXT_KEYS.has(key as string)) {
        commitAnswer(key, value);
      }
      setAnswers((prev) => ({ ...prev, [key]: value }));
    },
    [commitAnswer]
  );

  const nextStep = useCallback(() => setCurrentStep((s: number) => Math.min(s + 1, TOTAL_STEPS)), []);
  const prevStep = useCallback(() => setCurrentStep((s: number) => Math.max(s - 1, 1)), []);
  const goToStep = useCallback((n: number) => setCurrentStep(n), []);

  return (
    <QuizContext.Provider value={{ answers, currentStep, totalSteps: TOTAL_STEPS, maxReachedStep, setAnswer, commitAnswer, nextStep, prevStep, goToStep }}>
      {children}
    </QuizContext.Provider>
  );
}

export function useQuiz() {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error("useQuiz must be used within QuizProvider");
  return ctx;
}

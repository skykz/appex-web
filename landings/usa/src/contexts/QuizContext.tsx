import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { trackQuizStart, trackQuizComplete } from "@/lib/meta-pixel";

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

const TOTAL_STEPS = 45;

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
    }
  }, [currentStep]);

  const setAnswer = useCallback((key: keyof QuizAnswers, value: any) => {
    if (!quizStartFired.current) {
      quizStartFired.current = true;
      sessionStorage.setItem("appexQuizStartFired", "1");
      trackQuizStart();
    }
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const nextStep = useCallback(() => setCurrentStep((s: number) => Math.min(s + 1, TOTAL_STEPS)), []);
  const prevStep = useCallback(() => setCurrentStep((s: number) => Math.max(s - 1, 1)), []);
  const goToStep = useCallback((n: number) => setCurrentStep(n), []);

  return (
    <QuizContext.Provider value={{ answers, currentStep, totalSteps: TOTAL_STEPS, maxReachedStep, setAnswer, nextStep, prevStep, goToStep }}>
      {children}
    </QuizContext.Provider>
  );
}

export function useQuiz() {
  const ctx = useContext(QuizContext);
  if (!ctx) throw new Error("useQuiz must be used within QuizProvider");
  return ctx;
}

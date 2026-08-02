import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { trackQuizStart, trackQuizComplete } from "@/lib/meta-pixel";
import { ga4QuizStart, ga4QuizComplete, ga4QuizAnswer, ga4CtaClick } from "@/lib/ga4";
import { pushToDataLayer } from "@/lib/gtm";
import { overlayStepByIndex } from "@/lib/overlay-quiz-steps";
import { trackStepAnswer, getQuestionText, trackQuizEvent, buildQuizQuery } from "@/lib/quiz-tracker";

/** The one route the quiz overlay lives on. */
export const QUIZ_PATH = "/quiz";

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

/**
 * Reads back the answers persisted by the "Persist answers" effect below.
 * Only called once, at reducer init — this is what makes a refresh or a
 * shared /quiz?quiz_page_id=N link land with the earlier answers intact
 * instead of on a personalization screen ("Your age: —") built from nothing.
 */
function loadPersistedAnswers(): Answers {
  try {
    const raw = sessionStorage.getItem("appexQuiz");
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { answers?: Answers };
    return parsed.answers ?? {};
  } catch {
    return {};
  }
}

export const TOTAL_STEPS = 34;

/**
 * The quiz proper ends at the personal-plan reveal; step 34 is the discount
 * wheel, a paywall-funnel screen that happens to live inside the overlay.
 * `quiz_complete` stays pinned here so the metric keeps meaning "finished the
 * quiz" and stays comparable with data from before the wheel existed.
 */
const QUIZ_COMPLETE_STEP = 33;

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
  /** Opens the quiz (navigates to /quiz). `utmButton` names the CTA that
   *  triggered it and is surfaced in the URL as utm_button. */
  open: (utmButton?: string) => void;
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
  const navigate = useNavigate();
  const location = useLocation();
  // Lazy init reads sessionStorage AND the URL once, synchronously, before
  // first paint — this is what makes a refresh or a shared
  // /quiz?quiz_page_id=N link work at all. Doing this in an effect instead (as
  // an earlier version did) means the first render briefly answers with
  // step=1, and if a step->URL sync effect runs before a URL->step effect gets
  // a chance to correct it, that first render's step=1 gets pushed onto the
  // URL — clobbering the deep-linked step before it was ever read. Reading
  // window.location directly (not the `location` from useLocation, which
  // isn't available yet at this point in the component) sidesteps that
  // ordering question entirely: there is no wrong first render to race.
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const answers = loadPersistedAnswers();
    if (window.location.pathname !== QUIZ_PATH) return { step: 1, answers };
    const raw = new URLSearchParams(window.location.search).get("quiz_page_id");
    const step = Number(raw);
    return {
      step: Number.isInteger(step) && step >= 1 && step <= TOTAL_STEPS ? step : 1,
      answers,
    };
  });

  // The URL is the source of truth for "is the quiz open": /quiz shows it, any
  // other path hides it. This makes the quiz shareable/bookmarkable and lets the
  // browser Back button close it, instead of the open state living only in a
  // React flag the URL knows nothing about.
  const isOpen = location.pathname === QUIZ_PATH;

  // Fire quiz_start / quiz_complete once each, persisted so a reload mid-funnel
  // doesn't re-count them (mirrors the /quiz route's guards).
  const quizStartFired = useRef<boolean>(
    typeof sessionStorage !== "undefined" && sessionStorage.getItem("appexOverlayStartFired") === "1"
  );
  const quizCompleteFired = useRef<boolean>(
    typeof sessionStorage !== "undefined" && sessionStorage.getItem("appexOverlayCompleteFired") === "1"
  );

  const open = useCallback(
    (utmButton?: string) => {
      dispatch({ type: "RESET_STEP" });
      // If we're already on /quiz (a double-clicked CTA, or open() called twice),
      // replace instead of push. Two pushes would stack two identical /quiz
      // entries, so the first browser Back would land on the duplicate instead
      // of leaving the quiz — the user would have to press Back twice to exit.
      const alreadyOnQuiz = window.location.pathname === QUIZ_PATH;
      navigate(`${QUIZ_PATH}?${buildQuizQuery(1, utmButton)}`, { replace: alreadyOnQuiz });
    },
    [navigate]
  );
  // Always an explicit push to "/", never navigate(-1): with the one-history-
  // entry-per-step model below, "back out of the quiz entirely" and "back one
  // step" have to be different actions, or Back from step 15 would only step
  // back to step 14 instead of actually closing.
  const close = useCallback(() => navigate("/"), [navigate]);

  /**
   * URL <-> step. Two DIRECTIONS that must never both fire off the same
   * navigation, or whichever effect runs first corrupts the URL before the
   * other reads it — which is exactly what a single combined "sync on any
   * location.search change" effect did: on landing directly on
   * /quiz?quiz_page_id=5, the step->URL half saw the still-initial step (1)
   * and pushed quiz_page_id=1 before the URL->step half got a chance to read
   * the 5 that was actually in the address bar.
   *
   * The fix is to make the two directions structurally unable to race:
   *  1. Deep-link read happens ONCE, synchronously, in the SAME reducer init
   *     as loadPersistedAnswers() (see useReducer below) — not in an effect at
   *     all, so there is no first render with the wrong step to race against.
   *  2. Forward motion (next/prev/goto from the quiz UI) pushes a URL from
   *     `state.step` — this is the only writer of quiz_page_id after mount.
   *  3. The browser's OWN Back/Forward is handled by a dedicated `popstate`
   *     listener, not by watching `location.search` — `location.search`
   *     changes for both "the quiz pushed it" and "the user clicked Back",
   *     and telling those apart from inside a location-watching effect is
   *     exactly the ping-pong this replaces.
   */

  // step -> URL: push one entry per step change, preserving whatever other
  // params are already in the address bar (utm_button etc.) rather than
  // rebuilding the query from buildQuizQuery, which only knows utm_button at
  // the /quiz entry point and would otherwise drop it on the first step change.
  useEffect(() => {
    if (!isOpen) return;
    const params = new URLSearchParams(location.search);
    if (params.get("quiz_page_id") === String(state.step)) return;
    params.set("quiz_page_id", String(state.step));
    navigate(`${QUIZ_PATH}?${params.toString()}`);
    // location.search is deliberately omitted: this effect's job is "step
    // changed, push a URL for it", not "URL changed, do something" — the
    // latter is popstate's job below. Including it here would make this fire
    // on the browser's Back/Forward too and re-push the entry it just left.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, state.step, navigate]);

  // Browser's own Back/Forward: read quiz_page_id straight off window.location
  // (not the React Router `location` prop, which hasn't necessarily
  // re-rendered yet at the moment this fires) and jump the reducer straight
  // to it. No push here — popstate means the browser already moved the
  // history pointer; pushing again would fight it.
  useEffect(() => {
    const onPopState = () => {
      if (window.location.pathname !== QUIZ_PATH) return;
      const raw = new URLSearchParams(window.location.search).get("quiz_page_id");
      const target = raw ? Number(raw) : NaN;
      if (Number.isInteger(target) && target >= 1 && target <= TOTAL_STEPS) {
        dispatch({ type: "GOTO", step: target });
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

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
    // Also into our own store, so the funnel view has a real entry point rather
    // than inferring it from the first step_view.
    // step_id/step_order are required for the funnel report, which filters on
    // step_id and orders by step_order. 0 puts the entry point ahead of screen 1.
    trackQuizEvent({ event_name: "quiz_start", step_id: "quiz_start", step_order: 0, section: "intro", step_type: "milestone" });
  }, []);

  // quiz_complete when the last overlay step is reached.
  useEffect(() => {
    if (quizCompleteFired.current || state.step < QUIZ_COMPLETE_STEP) return;
    quizCompleteFired.current = true;
    try {
      sessionStorage.setItem("appexOverlayCompleteFired", "1");
    } catch {
      /* non-fatal */
    }
    trackQuizComplete();
    ga4QuizComplete();
    pushToDataLayer("quiz_complete");
    trackQuizEvent({ event_name: "quiz_complete", step_id: "quiz_complete", step_order: QUIZ_COMPLETE_STEP + 1, section: "plan", step_type: "milestone" });
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
      const ctaLocation = target.dataset.cta || "unknown";
      ga4CtaClick({ location: ctaLocation });
      pushToDataLayer("cta_click", { location: ctaLocation });
      e.preventDefault();
      // Pass the CTA name through so it lands in the URL as utm_button.
      open(ctaLocation);
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

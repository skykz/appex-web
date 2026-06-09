import { useState, useEffect, useRef } from "react";
import { planIndexToId, submitLandingQuiz, updateLandingQuizPlan } from "@/lib/landing-api";
import { redirectToSigninCheckout, redirectToSignupCheckout } from "@/lib/checkout-redirect";
import {
  PAYWALL_PLANS,
  PAYWALL_DEFAULT_INDEX,
  PAYWALL_FEATURES,
  PAYWALL_DISCOUNT_LABEL,
  ftcDisclosure,
  type PaywallPlan,
} from "@/lib/paywall-plans";
import paywallAfter from "@/assets/paywall-after.webp";
import paywallAfterMale from "@/assets/paywall-after-male.webp";
import paywallChloe from "@/assets/paywall-chloe.jpg";
import paywallCarlos from "@/assets/paywall-carlos.jpg";
import paywallSophia from "@/assets/paywall-sophia.jpg";

const ORANGE = "#F97316";
const BLACK = "#111";

/** Countdown from 10:00; stops at 00:00. */
function useCountdown(minutes: number) {
  const [secs, setSecs] = useState(minutes * 60);
  useEffect(() => {
    const iv = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(iv);
  }, []);
  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getQuizData() {
  try {
    const s = sessionStorage.getItem("appexQuiz");
    return s ? JSON.parse(s).answers || {} : {};
  } catch {
    return {};
  }
}

/** Single plan radio row on the paywall. */
function PricingRow({
  plan,
  selected,
  onClick,
}: {
  plan: PaywallPlan;
  selected: boolean;
  onClick: () => void;
}) {
  const isDark = plan.popular && selected;

  const inner = (
    <button
      type="button"
      onClick={onClick}
      className="relative w-full rounded-2xl px-4 py-3 text-left cursor-pointer transition-all flex items-center justify-between gap-3"
      style={{
        background: isDark ? BLACK : selected ? "#FFF7ED" : "#FAFAFA",
        border: isDark ? `2px solid ${BLACK}` : selected ? `2px solid ${ORANGE}` : "2px solid #E5E5E5",
      }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0"
          style={{
            borderColor: selected ? (isDark ? "white" : ORANGE) : "#D1D5DB",
            background: selected ? (isDark ? "white" : ORANGE) : "white",
          }}
        >
          {selected && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isDark ? BLACK : "white"} strokeWidth="3.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[17px] font-extrabold leading-none" style={{ color: isDark ? "white" : BLACK }}>
              {plan.label}
              {plan.popular ? " ⭐" : ""}
            </span>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: isDark ? ORANGE : "#FFF7ED", color: isDark ? "white" : ORANGE }}
            >
              Save {PAYWALL_DISCOUNT_LABEL}
            </span>
          </div>
          <p className="text-[13px]" style={{ color: isDark ? "rgba(255,255,255,0.65)" : "#6B7280" }}>
            <s>${plan.renewalPrice}</s> <span className="mx-1">→</span>{" "}
            <strong style={{ color: isDark ? "white" : BLACK }}>${plan.introPrice}</strong>
          </p>
        </div>
      </div>
      <div
        className="flex-shrink-0 text-center px-4 py-2 rounded-xl min-w-[80px]"
        style={{ background: isDark ? "rgba(255,255,255,0.12)" : "#F3F4F6" }}
      >
        <p className="text-[11px] line-through leading-none mb-0.5" style={{ color: isDark ? "rgba(255,255,255,0.5)" : "#94A3B8" }}>
          ${plan.perDayWas}
        </p>
        <p className="text-[22px] font-black leading-none" style={{ color: isDark ? "white" : BLACK }}>
          ${plan.perDay}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: isDark ? "rgba(255,255,255,0.6)" : "#94A3B8" }}>
          per day
        </p>
      </div>
    </button>
  );

  if (plan.popular) {
    return (
      <div className="rounded-2xl p-2 pt-3" style={{ background: "#FFF7ED", border: "1.5px solid #FED7AA" }}>
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span className="text-[13px]">🏆</span>
          <span className="text-[13px] font-bold" style={{ color: ORANGE }}>
            Most popular
          </span>
        </div>
        {inner}
      </div>
    );
  }
  return inner;
}

/** Plan picker, CTA, FTC disclosure, and feature list. */
function PricingBlock({
  onGetPlan,
  onSignIn,
  selected,
  setSelected,
}: {
  onGetPlan: () => void;
  onSignIn: () => void;
  selected: number;
  setSelected: (i: number) => void;
}) {
  const plan = PAYWALL_PLANS[selected];

  return (
    <div>
      <ul className="space-y-2 mb-3">
        {PAYWALL_FEATURES.map((t) => (
          <li key={t} className="flex items-start gap-3 text-[13px]" style={{ color: BLACK }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#FFF7ED" }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="3.5">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            {t}
          </li>
        ))}
      </ul>

      <div className="space-y-2 mb-3">
        {PAYWALL_PLANS.map((p, i) => (
          <PricingRow key={p.id} plan={p} selected={selected === i} onClick={() => setSelected(i)} />
        ))}
      </div>

      <button
        id="get-my-plan-btn"
        type="button"
        onClick={onGetPlan}
        className="animate-pulse-cta w-full py-4 rounded-2xl text-white font-bold text-[17px] border-none cursor-pointer mb-2 flex items-center justify-center tracking-wide"
        style={{ background: BLACK }}
      >
        GET MY PLAN
      </button>

      <p className="text-[12px] text-center mb-2" style={{ color: "#64748B" }}>
        Then renews at full price. Cancel anytime.
      </p>

      <p className="text-[13px] text-center mb-3">
        <button
          type="button"
          onClick={onSignIn}
          className="bg-transparent border-none cursor-pointer underline underline-offset-2"
          style={{ color: "#64748B" }}
        >
          I already have an account
        </button>
      </p>

      <p className="text-[11px] leading-relaxed text-center px-1" style={{ color: "#94A3B8" }}>
        {ftcDisclosure(plan)}
      </p>
    </div>
  );
}

export default function Paywall() {
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [selected, setSelected] = useState(PAYWALL_DEFAULT_INDEX);
  const timer = useCountdown(10);
  const data = getQuizData();
  const quizEmail = (data.email as string | undefined)?.trim().toLowerCase();
  const quizName = (data.name as string | undefined)?.trim();
  const planSavedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!quizEmail) return;
    const planId = planIndexToId(selected);
    const key = `${quizEmail}:${planId}`;
    if (planSavedRef.current === key) return;
    planSavedRef.current = key;

    void (async () => {
      const saved = getQuizData();
      const ok = await updateLandingQuizPlan(quizEmail, planId);
      if (!ok) {
        await submitLandingQuiz({
          email: quizEmail,
          name: saved.name as string | undefined,
          answers: saved,
          selected_plan: planId,
        });
      }
    })();
  }, [selected, quizEmail]);

  const isMale = data.gender?.toLowerCase() === "male";
  const heroImg = isMale ? paywallAfterMale : paywallAfter;
  const goal = data.main_goal || data.goal || "Start my own business";
  const hours = data.daily_time_commitment || data.preferredHours || data.currentHours || "30 min/day";
  const barrier = data.primary_fear || data.stoppingYou || data.frustration || "Lack of free time";

  const handleGetPlan = () => {
    const interval = PAYWALL_PLANS[selected].id;
    const ok = redirectToSignupCheckout({
      email: quizEmail,
      name: quizName,
      interval,
    });
    if (!ok) {
      window.alert("Checkout is not configured yet. Set VITE_APP_URL on the USA landing deployment.");
    }
  };

  const handleSignIn = () => {
    const interval = PAYWALL_PLANS[selected].id;
    const ok = redirectToSigninCheckout({ email: quizEmail, interval });
    if (!ok) {
      window.alert("Sign-in is not configured yet. Set VITE_APP_URL on the USA landing deployment.");
    }
  };

  useEffect(() => {
    const el = document.getElementById("get-my-plan-btn");
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        setShowStickyCta(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#FFFFFF" }}>
      <div className="sticky top-0 z-50 flex items-center justify-center gap-3 py-2.5 px-4" style={{ background: "#ECFDF5", borderBottom: "1px solid #D1FAE5" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M9 12l2 2 4-4" />
        </svg>
        <span className="text-[14px] font-semibold" style={{ color: "#16A34A" }}>
          Start with {PAYWALL_DISCOUNT_LABEL} off
        </span>
        <span className="text-[14px] font-mono font-bold px-2.5 py-0.5 rounded-lg" style={{ background: "#86EFAC", color: "#064E3B" }}>
          {timer}
        </span>
      </div>

      <div className="mx-auto px-4 pb-20" style={{ maxWidth: 600 }}>
        <section id="plan-block" className="pt-8 mb-6">
          <h1 className="text-[32px] md:text-[42px] font-extrabold text-center mb-7 leading-[1.1] tracking-tight" style={{ color: BLACK }}>
            Start mastering AI today with{" "}
            <span style={{ color: ORANGE }}>{PAYWALL_DISCOUNT_LABEL} intro offer!</span>
          </h1>
          <PricingBlock
            onGetPlan={handleGetPlan}
            onSignIn={handleSignIn}
            selected={selected}
            setSelected={setSelected}
          />
        </section>

        <section className="mb-8">
          <div className="flex justify-center -mb-7 relative z-10">
            <div className="w-14 h-14 flex items-center justify-center rounded-full border-4 border-white shadow-md" style={{ background: "#10B981" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
          </div>
          <div className="rounded-3xl p-7 pt-12 text-center border" style={{ background: "#F8FAFC", borderColor: "#E5E5E5" }}>
            <h2 className="text-[24px] font-extrabold mb-3" style={{ color: BLACK }}>
              Money-back guarantee
            </h2>
            <p className="text-[14px] leading-relaxed mb-5" style={{ color: "#475569" }}>
              You are eligible for a full refund within 7 days if you have not opened any lessons. Email support@appex.me to request.
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-[26px] md:text-[30px] font-extrabold text-center mb-6 leading-tight" style={{ color: BLACK }}>
            Your Appex <span style={{ color: ORANGE }}>Learning Plan</span> Is Ready
          </h2>
          <div className="rounded-3xl p-4 space-y-3 border" style={{ background: "#FFF7ED", borderColor: "#FED7AA" }}>
            <div className="rounded-2xl overflow-hidden bg-white p-3 border" style={{ borderColor: "#F3F4F6" }}>
              <img src={heroImg} alt="Your future self" className="mx-auto h-[150px] w-auto object-contain rounded-xl" style={{ background: "#F8FAFC" }} />
              <div className="text-center py-4">
                <p className="text-[13px] mb-1.5" style={{ color: "#6B7280" }}>Your goal</p>
                <p className="text-[15px] font-bold flex items-center justify-center gap-2" style={{ color: BLACK }}>
                  <span style={{ color: ORANGE }}>🎯</span> {goal}
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center border" style={{ borderColor: "#F3F4F6" }}>
              <p className="text-[13px] mb-1.5" style={{ color: "#6B7280" }}>You&apos;re ready to invest</p>
              <p className="text-[15px] font-bold flex items-center justify-center gap-2" style={{ color: BLACK }}>
                <span style={{ color: ORANGE }}>⏱</span> {hours}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center border" style={{ borderColor: "#F3F4F6" }}>
              <p className="text-[13px] mb-1.5" style={{ color: "#6B7280" }}>Your former barrier</p>
              <p className="text-[15px] font-bold flex items-center justify-center gap-2" style={{ color: BLACK }}>
                <span style={{ color: ORANGE }}>⚡</span> {barrier}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border" style={{ background: "#ECFDF5", borderColor: "#D1FAE5" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
              <path d="M3 20h18M6 16V8m4 8V4m4 12v-6m4 6v-9" />
            </svg>
            <p className="text-[13px]" style={{ color: BLACK }}>
              Your AI potential score is better than <strong style={{ color: "#16A34A" }}>83%</strong> of learners
            </p>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-[26px] md:text-[30px] font-extrabold text-center mb-6 leading-tight" style={{ color: BLACK }}>
            See real impact of mastering <span className="italic" style={{ color: ORANGE }}>AI</span>
          </h2>
          <div className="rounded-3xl border overflow-hidden" style={{ borderColor: "#E5E5E5" }}>
            {[
              { icon: "💰", bold: "Earn more", rest: " by making AI fluency your competitive edge at work" },
              { icon: "🎤", bold: "Impress in every meeting", rest: " by delivering AI-backed insights and results" },
              { icon: "🏅", bold: "Get an Appex Mastery Certificate", rest: " that stands out on your LinkedIn & CV" },
              { icon: "⏳", bold: "Save 2+ hours a day", rest: " by letting AI handle writing, research, and analysis" },
            ].map((item, i, arr) => (
              <div key={i} className="px-6 py-5 flex items-start gap-4" style={{ borderBottom: i < arr.length - 1 ? "1px solid #F3F4F6" : "none" }}>
                <span className="text-[26px] flex-shrink-0 mt-0.5">{item.icon}</span>
                <p className="text-[14px] leading-relaxed pt-1" style={{ color: BLACK }}>
                  <strong>{item.bold}</strong>
                  <span style={{ color: "#475569" }}>{item.rest}</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-[26px] md:text-[30px] font-extrabold text-center mb-3" style={{ color: BLACK }}>
            Hear it from Appex users
          </h2>
          <div className="space-y-4">
            {[
              { img: paywallChloe, name: "Chloe R.", loc: "Austin, TX", date: "May 13, 2026", title: "Exceeded expectations!", body: "I had no real experience with AI before, but the step-by-step approach made it click surprisingly fast." },
              { img: paywallCarlos, name: "Carlos M.", loc: "Miami, FL", date: "May 7, 2026", title: "It finally made sense", body: "Before this, I was just guessing how to use AI. Now I actually have a clear structure." },
              { img: paywallSophia, name: "Sophia K.", loc: "New York, NY", date: "May 2, 2026", title: "Changed how I work completely", body: "After going through this program I realized it shapes not just your skills, but how you think about building a business with AI." },
            ].map((r) => (
              <div key={r.name} className="rounded-2xl border p-5" style={{ borderColor: "#E5E5E5" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img src={r.img} alt={r.name} className="w-9 h-9 rounded-full object-cover" />
                  </div>
                  <span className="text-[11px]" style={{ color: "#94A3B8" }}>{r.date}</span>
                </div>
                <p className="text-[12px] mb-2" style={{ color: "#6B7280" }}>{r.name} | {r.loc}</p>
                <p className="text-[15px] font-bold mb-1.5" style={{ color: BLACK }}>{r.title}</p>
                <p className="text-[13px] leading-relaxed" style={{ color: "#475569" }}>{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-center border-t pt-8" style={{ borderColor: "#E5E5E5" }}>
          <p className="text-[12px] mb-2" style={{ color: "#64748B" }}>
            By proceeding, you agree with{" "}
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: ORANGE }}>Terms and Conditions</a>,{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: ORANGE }}>Privacy Policy</a>,{" "}
            <a href="/subscription" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: ORANGE }}>Subscription Terms</a>
          </p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="text-[12px] font-extrabold" style={{ color: BLACK }}>App</span>
            <span className="text-[12px] font-extrabold" style={{ color: ORANGE }}>ex</span>
            <span className="text-[12px]" style={{ color: "#94A3B8" }}> Inc.</span>
          </div>
        </footer>
      </div>

      {showStickyCta && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 py-3 border-t" style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(8px)", borderColor: "#E5E5E5" }}>
          <button
            type="button"
            onClick={handleGetPlan}
            className="mx-auto block w-full max-w-[440px] py-3.5 rounded-2xl text-white font-bold text-[15px] border-none cursor-pointer tracking-wide"
            style={{ background: BLACK }}
          >
            GET MY PLAN
          </button>
        </div>
      )}
    </div>
  );
}

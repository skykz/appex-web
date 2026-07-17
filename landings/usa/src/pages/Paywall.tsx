import { useState, useEffect, useRef } from "react";
import { LegalLink } from "@/components/legal/LegalLink";
import { planIndexToId, submitLandingQuiz, createLandingCheckout } from "@/lib/landing-api";
import { redirectToSigninCheckout } from "@/lib/checkout-redirect";
import { trackInitiateCheckout, getMetaBrowserIds } from "@/lib/meta-pixel";
import { ga4BeginCheckout, getGa4ClientId } from "@/lib/ga4";
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

/* ── Countdown Timer ── */
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

/** Decorative laurel icon flanking paywall trust badges. */
function Laurel({ side }: { side: "left" | "right" }) {
  return (
    <svg
      width="32"
      height="52"
      viewBox="0 0 36 56"
      fill="none"
      style={{ transform: side === "right" ? "scaleX(-1)" : undefined }}
      aria-hidden
    >
      <path d="M30 4 C 14 12, 6 28, 8 52" stroke="#E0A91A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {[6, 13, 20, 27, 34, 41, 48].map((y, i) => {
        const x = 30 - i * 3.6;
        const rot = -55 + i * 6;
        return (
          <ellipse
            key={i}
            cx={x}
            cy={y}
            rx="5.5"
            ry="2.6"
            fill="#F5C13A"
            stroke="#C68A0E"
            strokeWidth="0.8"
            transform={`rotate(${rot} ${x} ${y})`}
          />
        );
      })}
    </svg>
  );
}

/** Renders one Trustpilot-style square star (full or half for the 4.5 rating). */
function TrustpilotStar({ half, clipId }: { half?: boolean; clipId: string }) {
  const starPath =
    "M9 12.2l-2.4 2.5 0.6-3.1L5 9.3l3.1-0.5L9 6l0.9 2.8 3.1 0.5-2.2 2.3 0.6 3.1z";

  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden className="shrink-0">
      {half && (
        <defs>
          <clipPath id={clipId}>
            <rect x="0" y="0" width="9" height="18" />
          </clipPath>
        </defs>
      )}
      <rect width="18" height="18" rx="1" fill={half ? "#DCDCE6" : "#00B67A"} />
      {half && <rect width="18" height="18" rx="1" fill="#00B67A" clipPath={`url(#${clipId})`} />}
      <path d={starPath} fill="white" />
    </svg>
  );
}

/** Trustpilot rating and learner count shown beneath subscription plan cards. */
function PaywallTrustBadges() {
  const halfStarClipId = "paywall-trust-half-star";

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-8 mb-4 flex-wrap">
      <div className="flex items-center gap-2">
        <Laurel side="left" />
        <div className="text-center">
          <p className="text-[13px] font-bold leading-tight" style={{ color: BLACK }}>
            4.5 excellent
          </p>
          <div className="flex gap-0.5 my-1 justify-center">
            {[1, 2, 3, 4].map((i) => (
              <TrustpilotStar key={i} clipId={`${halfStarClipId}-${i}`} />
            ))}
            <TrustpilotStar half clipId={halfStarClipId} />
          </div>
          <p className="text-[11px]" style={{ color: "#475569" }}>
            on Trustpilot
          </p>
        </div>
        <Laurel side="right" />
      </div>

      <div className="flex items-center gap-2">
        <Laurel side="left" />
        <div className="text-center">
          <p className="text-[14px] font-bold leading-tight" style={{ color: BLACK }}>
            50K+ learners
          </p>
          <p className="text-[11px] mt-1" style={{ color: "#475569" }}>
            Learned new skills
          </p>
        </div>
        <Laurel side="right" />
      </div>
    </div>
  );
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
        background: isDark ? BLACK : selected ? '#FFF7ED' : 'white',
        border: isDark ? `2px solid ${BLACK}` : selected ? `2px solid ${ORANGE}` : '2px solid #E5E5E5',
      }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0"
          style={{ borderColor: selected ? (isDark ? 'white' : ORANGE) : '#D1D5DB', background: selected ? (isDark ? 'white' : ORANGE) : 'white' }}>
          {selected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isDark ? BLACK : "white"} strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[17px] font-extrabold leading-none" style={{ color: isDark ? 'white' : BLACK }}>{plan.label}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: isDark ? ORANGE : '#FFF7ED', color: isDark ? 'white' : ORANGE }}>Save {PAYWALL_DISCOUNT_LABEL}</span>
          </div>
          <p className="text-[12px] leading-tight" style={{ color: isDark ? 'rgba(255,255,255,0.65)' : '#6B7280' }}>
            ${plan.introPrice} · Renews at <s>${plan.renewalPrice}</s>/{plan.renewUnit}
          </p>
        </div>
      </div>
      <div className="flex-shrink-0 text-center px-3 py-2 rounded-xl min-w-[74px]"
        style={{ background: isDark ? 'rgba(255,255,255,0.12)' : '#F3F4F6' }}>
        <p className="text-[11px] line-through leading-none mb-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#94A3B8' }}>${plan.perDayWas}</p>
        <p className="text-[20px] font-black leading-none" style={{ color: isDark ? 'white' : BLACK }}>${plan.perDay}</p>
        <p className="text-[10px] mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#94A3B8' }}>per day</p>
      </div>
    </button>
  );

  if (plan.popular) {
    return (
      <div className="rounded-2xl p-2 pt-3" style={{ background: '#FFF7ED', border: `1.5px solid #FED7AA` }}>
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span className="text-[13px]">⭐</span>
          <span className="text-[13px] font-bold" style={{ color: ORANGE }}>Most popular</span>
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
  checkoutLoading,
}: {
  onGetPlan: () => void;
  onSignIn: () => void;
  selected: number;
  setSelected: (i: number) => void;
  checkoutLoading: boolean;
}) {
  const plan = PAYWALL_PLANS[selected];

  return (
    <div>
      {/* Features checklist */}
      <ul className="space-y-2 mb-3">
        {PAYWALL_FEATURES.map((t) => (
          <li key={t} className="flex items-start gap-3 text-[13px]" style={{ color: BLACK }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#FFF7ED' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>
            </span>
            {t}
          </li>
        ))}
      </ul>

      {/* Pricing cards */}
      <div className="space-y-2 mb-3">
        {PAYWALL_PLANS.map((p, i) => (
          <PricingRow key={p.id} plan={p} selected={selected === i} onClick={() => setSelected(i)} />
        ))}
      </div>

      <PaywallTrustBadges />

      {/* GET MY PLAN button — same on mobile and desktop */}
      <button
        id="get-my-plan-btn"
        type="button"
        onClick={onGetPlan}
        disabled={checkoutLoading}
        className="animate-pulse-cta w-full py-4 rounded-2xl text-white font-bold text-[17px] border-none cursor-pointer mb-3 flex items-center justify-center tracking-wide disabled:opacity-60"
        style={{ background: BLACK }}
      >
        {checkoutLoading ? "Redirecting…" : "GET MY PLAN"}
      </button>

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

      {/* FTC-required pre-checkout disclosure (dynamic per plan) */}
      <p className="text-center mb-5 leading-relaxed font-body text-[11px] md:text-[12.5px]" style={{ color: '#888888' }}>
        {ftcDisclosure(plan)}
      </p>
    </div>
  );
}

export default function Paywall() {
  const [showStickyCta, setShowStickyCta] = useState(false);
  const [selected, setSelected] = useState(PAYWALL_DEFAULT_INDEX);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const timer = useCountdown(10);
  const data = getQuizData();
  const quizEmail = (data.email as string | undefined)?.trim().toLowerCase();
  // The quiz stores the name under `userName` (StepName); keep `name` as a
  // fallback in case another entry path sets it.
  const quizName = ((data.userName ?? data.name) as string | undefined)?.trim();
  const planSavedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!quizEmail) return;
    const planId = planIndexToId(selected);
    const key = `${quizEmail}:${planId}`;
    if (planSavedRef.current === key) return;
    planSavedRef.current = key;

    void (async () => {
      const saved = getQuizData();
      await submitLandingQuiz({
        email: quizEmail,
        name: (saved.userName ?? saved.name) as string | undefined,
        answers: saved,
        selected_plan: planId,
      });
    })();
  }, [selected, quizEmail]);

  const isMale = data.gender?.toLowerCase() === "male";
  const heroImg = isMale ? paywallAfterMale : paywallAfter;
  const goal = data.main_goal || data.goal || "Start my own business";
  const hours = data.daily_time_commitment || data.preferredHours || data.currentHours || "30 min/day";
  const barrier = data.primary_fear || data.stoppingYou || data.frustration || "Lack of free time";

  const handleGetPlan = async () => {
    if (checkoutLoading) return;
    // No quiz email means the paywall was opened directly (fresh tab / bookmark)
    // without completing the funnel. Don't fire checkout events or create an
    // orphan Stripe session with an empty email — send them to collect an email.
    if (!quizEmail) {
      window.alert("Please complete the quiz so we can set up your account.");
      window.location.href = "/quiz";
      return;
    }
    const plan = PAYWALL_PLANS[selected];
    const interval = plan.id;
    setCheckoutLoading(true);

    // Report the RECURRING (renewal) price as the conversion value, matching the
    // server-side Purchase, so value-based bidding sees true subscriber worth and
    // the browser/server events agree on value for clean dedup.
    const conversionValue = Number(plan.renewalPrice);

    // Fire InitiateCheckout / begin_checkout and reuse the Meta event_id + cookies
    // and the GA4 client_id for the server-side Purchase, so both Meta and GA4
    // deduplicate/attribute the two hits into one conversion.
    const eventId = trackInitiateCheckout({
      value: conversionValue,
      currency: "USD",
      plan: interval,
    });
    ga4BeginCheckout({ value: conversionValue, currency: "USD", plan: interval });
    // Persist the chosen plan/value so the success page fires the browser Purchase
    // with the same value the server reports.
    try {
      sessionStorage.setItem(
        "appexCheckout",
        JSON.stringify({ plan: interval, value: conversionValue, currency: "USD" })
      );
    } catch {
      /* storage disabled — success page falls back to server-only Purchase */
    }
    const { fbp, fbc } = getMetaBrowserIds();

    try {
      const ga4ClientId = await getGa4ClientId();
      const result = await createLandingCheckout({
        email: quizEmail ?? "",
        name: quizName,
        interval,
        meta: { event_id: eventId, fbp, fbc },
        ga4: { client_id: ga4ClientId },
      });

      if ("error" in result) {
        window.alert(result.error);
        return;
      }
      window.location.href = result.url;
    } catch {
      // Network/CORS failure rejects the promise — surface it and re-enable the
      // button (the finally below) instead of leaving it stuck on "Redirecting…".
      window.alert("Could not reach the payment server. Please try again.");
    } finally {
      setCheckoutLoading(false);
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
    <div className="min-h-screen" style={{ background: '#FFFFFF' }}>
      {/* Top sticky promo banner */}
      <div className="sticky top-0 z-50 flex items-center justify-center gap-3 py-2.5 px-4" style={{ background: '#ECFDF5', borderBottom: '1px solid #D1FAE5' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
        <span className="text-[14px] font-semibold" style={{ color: '#16A34A' }}>Start with {PAYWALL_DISCOUNT_LABEL} off</span>
        <span className="text-[14px] font-mono font-bold px-2.5 py-0.5 rounded-lg" style={{ background: '#86EFAC', color: '#064E3B' }}>{timer}</span>
      </div>

      <div className="mx-auto px-4 pb-20" style={{ maxWidth: 600 }}>

        {/* Section 1 — Headline + Pricing */}
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
            checkoutLoading={checkoutLoading}
          />
        </section>

        {/* Section 2 — Money-back guarantee */}
        <section className="mb-8">
          <div className="flex justify-center -mb-7 relative z-10">
            <div className="w-14 h-14 flex items-center justify-center rounded-full border-4 border-white shadow-md" style={{ background: '#10B981' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
          </div>
          <div className="rounded-3xl p-7 pt-12 text-center border" style={{ background: '#F8FAFC', borderColor: '#E5E5E5' }}>
            <h2 className="text-[24px] font-extrabold mb-3" style={{ color: BLACK }}>Money-back guarantee</h2>
            <p className="text-[14px] leading-relaxed mb-5" style={{ color: '#475569' }}>
              If you aren't happy with your course after giving it your full attention, we'll refund your purchase. You just need to email us at hello@appex.me
            </p>
            <button className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-white font-semibold text-[14px] border-none cursor-pointer" style={{ background: BLACK }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
              Risk-free learning
            </button>
          </div>
        </section>

        {/* Section 3 — Your Learning Plan */}
        <section className="mb-12">
          <h2 className="text-[26px] md:text-[30px] font-extrabold text-center mb-6 leading-tight" style={{ color: BLACK }}>
            Your personal <span style={{ color: ORANGE }}>Claude roadmap</span> is set
          </h2>
          <div className="rounded-3xl p-4 space-y-3 border" style={{ background: '#FFF7ED', borderColor: '#FED7AA' }}>
            <div className="rounded-2xl overflow-hidden bg-white p-3 border" style={{ borderColor: '#F3F4F6' }}>
              <img src={heroImg} alt="Your future self" className="mx-auto h-[120px] md:h-[150px] w-auto object-contain rounded-xl" style={{ background: '#F8FAFC' }} />
              <div className="text-center py-4">
                <p className="text-[13px] mb-1.5" style={{ color: '#6B7280' }}>What you want</p>
                <p className="text-[15px] font-bold flex items-center justify-center gap-2" style={{ color: BLACK }}>
                  <span style={{ color: ORANGE }}>🎯</span> {goal}
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center border" style={{ borderColor: '#F3F4F6' }}>
              <p className="text-[13px] mb-1.5" style={{ color: '#6B7280' }}>Time you'll commit</p>
              <p className="text-[15px] font-bold flex items-center justify-center gap-2" style={{ color: BLACK }}>
                <span style={{ color: ORANGE }}>⏱</span> {hours}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center border" style={{ borderColor: '#F3F4F6' }}>
              <p className="text-[13px] mb-1.5" style={{ color: '#6B7280' }}>What was holding you back</p>
              <p className="text-[15px] font-bold flex items-center justify-center gap-2" style={{ color: BLACK }}>
                <span style={{ color: ORANGE }}>⚡</span> {barrier}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border" style={{ background: '#ECFDF5', borderColor: '#D1FAE5' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2"><path d="M3 20h18M6 16V8m4 8V4m4 12v-6m4 6v-9"/></svg>
            <p className="text-[13px]" style={{ color: BLACK }}>
              You're ahead of <strong style={{ color: '#16A34A' }}>83%</strong> of new learners at this stage
            </p>
          </div>
        </section>

        {/* Section 4 — See real impact */}
        <section className="mb-12">
          <h2 className="text-[26px] md:text-[30px] font-extrabold text-center mb-6 leading-tight" style={{ color: BLACK }}>
            What changes when you{" "}
            <span className="italic" style={{ color: ORANGE }}>master Claude</span>
          </h2>
          <div className="rounded-3xl border overflow-hidden" style={{ borderColor: '#E5E5E5' }}>
            {[
              { icon: "💰", bold: "Earn more", rest: " — turn AI fluency into your edge at work and in side projects" },
              { icon: "🎤", bold: "Stand out in meetings", rest: " — show up with sharper insights, faster decisions, better output" },
              { icon: "🏅", bold: "Add a real credential", rest: " — the Appex Certificate that hiring teams actually recognize" },
              { icon: "⏳", bold: "Save hours every day", rest: " — let Claude take over writing, research, and admin work" },
            ].map((item, i, arr) => (
              <div key={i} className="px-6 py-5 flex items-start gap-4" style={{ borderBottom: i < arr.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                <span className="text-[26px] flex-shrink-0 mt-0.5">{item.icon}</span>
                <p className="text-[14px] leading-relaxed pt-1" style={{ color: BLACK }}>
                  <strong>{item.bold}</strong>
                  <span style={{ color: '#475569' }}>{item.rest}</span>
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 5 — Hear it from Appex users */}
        <section className="mb-12">
          <h2 className="text-[26px] md:text-[30px] font-extrabold text-center mb-3" style={{ color: BLACK }}>
            What Appex learners are saying
          </h2>
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-[13px] font-semibold" style={{ color: BLACK }}>Verified student reviews</span>
            <div className="flex gap-0.5">
              {[1,2,3,4,5].map(i => (
                <span key={i} className="text-[14px]" style={{ color: '#F59E0B' }}>★</span>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {[
              { img: paywallChloe, name: "Chloe R.", loc: "Austin, TX", date: "May 13, 2026", title: "Exceeded expectations!", body: "I had no real experience with AI before, but the step-by-step approach made it click surprisingly fast. Within a few days, I was already using Appex to write, organize ideas, and handle tasks I used to do manually." },
              { img: paywallCarlos, name: "Carlos M.", loc: "Miami, FL", date: "May 7, 2026", title: "It finally made sense", body: "Before this, I was just guessing how to use AI. Now I actually have a clear structure — I use Appex for writing, research, and daily work tasks, and it just feels natural." },
              { img: paywallSophia, name: "Sophia K.", loc: "New York, NY", date: "May 2, 2026", title: "Changed how I work completely", body: "I do enjoy every moment when I learn something new. After going through this program I realized it shapes not just your skills, but how you think about building a business with AI." },
            ].map((r) => (
              <div key={r.name} className="rounded-2xl border p-5" style={{ borderColor: '#E5E5E5' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img src={r.img} alt={r.name} className="w-9 h-9 rounded-full object-cover" />
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(i => <span key={i} className="text-[13px]" style={{ color: '#F59E0B' }}>★</span>)}
                    </div>
                  </div>
                  <span className="text-[11px]" style={{ color: '#94A3B8' }}>{r.date}</span>
                </div>
                <p className="text-[12px] mb-2" style={{ color: '#6B7280' }}>{r.name} | {r.loc}</p>
                <p className="text-[15px] font-bold mb-1.5" style={{ color: BLACK }}>{r.title}</p>
                <p className="text-[13px] leading-relaxed" style={{ color: '#475569' }}>{r.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 6 — Why Appex */}
        <section className="mb-12">
          <div className="rounded-3xl p-6 border" style={{ background: '#FAFAFA', borderColor: '#E5E5E5' }}>
            <h2 className="text-[26px] md:text-[30px] font-extrabold text-center mb-6" style={{ color: BLACK }}>
              Why learners choose Appex
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Card 1 — Progress dial */}
              <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: '#F3F4F6' }}>
                <div className="h-[160px] rounded-xl flex items-center justify-center" style={{ background: '#FFF7ED' }}>
                  {/* Circular progress */}
                  <div className="relative w-[110px] h-[110px]">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="#FED7AA" strokeWidth="10" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke={ORANGE} strokeWidth="10" strokeLinecap="round" strokeDasharray="263.9" strokeDashoffset="89.7" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[28px] font-extrabold leading-none" style={{ color: BLACK }}>66%</span>
                      <span className="text-[10px] font-semibold mt-0.5" style={{ color: '#94A3B8' }}>complete</span>
                    </div>
                  </div>
                </div>
                <p className="text-[13px] font-semibold leading-snug mt-4" style={{ color: BLACK }}>Track real progress — every lesson moves you measurably forward</p>
              </div>

              {/* Card 2 — Calendar with daily check-ins */}
              <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: '#F3F4F6' }}>
                <div className="h-[160px] rounded-xl flex items-center justify-center p-4" style={{ background: '#F8FAFC' }}>
                  <div className="bg-white rounded-xl shadow-sm p-3 w-full max-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold" style={{ color: BLACK }}>This week</p>
                      <p className="text-[9px] font-semibold" style={{ color: ORANGE }}>4 / 7 days</p>
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                      {[
                        { d: 'M', on: true },
                        { d: 'T', on: true },
                        { d: 'W', on: true },
                        { d: 'T', on: false, today: true },
                        { d: 'F', on: false },
                        { d: 'S', on: false },
                        { d: 'S', on: false },
                      ].map((day, i) => (
                        <div key={i} className="flex flex-col items-center gap-0.5">
                          <span className="text-[8px] font-bold" style={{ color: '#94A3B8' }}>{day.d}</span>
                          <div
                            className="w-6 h-6 rounded-md flex items-center justify-center"
                            style={{
                              background: day.on ? ORANGE : day.today ? '#FFF7ED' : '#F1F5F9',
                              border: day.today ? `1.5px dashed ${ORANGE}` : 'none',
                            }}
                          >
                            {day.on && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>
                            )}
                            {day.today && !day.on && (
                              <span className="text-[8px] font-bold" style={{ color: ORANGE }}>•</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-[13px] font-semibold leading-snug mt-4" style={{ color: BLACK }}>Built around your schedule — short daily sessions you'll actually finish</p>
              </div>

              {/* Card 3 — Chat with Claude (mini conversation) */}
              <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: '#F3F4F6' }}>
                <div className="h-[160px] rounded-xl flex flex-col justify-center gap-2 p-4" style={{ background: '#F8FAFC' }}>
                  <div className="self-end max-w-[80%] rounded-lg rounded-tr-sm px-2.5 py-1.5 text-[10px] leading-snug" style={{ background: ORANGE, color: 'white' }}>
                    Draft a follow-up email…
                  </div>
                  <div className="self-start flex items-start gap-1.5 max-w-[85%]">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(204,120,92,0.15)' }}>
                      <svg viewBox="0 0 100 100" className="w-3 h-3">
                        {Array.from({ length: 10 }, (_, i) => (
                          <rect key={i} x="46" y="10" width="8" height="34" rx="4" fill="#CC785C" transform={`rotate(${i * 36} 50 50)`} />
                        ))}
                      </svg>
                    </div>
                    <div className="rounded-lg rounded-tl-sm bg-white border px-2.5 py-1.5 text-[10px] leading-snug" style={{ borderColor: '#E5E7EB', color: BLACK }}>
                      Here's a friendly, concise version…
                    </div>
                  </div>
                </div>
                <p className="text-[13px] font-semibold leading-snug mt-4" style={{ color: BLACK }}>Hands-on with the real tool — every lesson uses Claude live</p>
              </div>

              {/* Card 4 — Certificate */}
              <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: '#F3F4F6' }}>
                <div className="h-[160px] rounded-xl flex items-center justify-center p-4" style={{ background: '#FFF7ED' }}>
                  <div className="bg-white rounded-xl shadow-sm p-3 w-full relative">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-[10px] font-extrabold tracking-wide" style={{ color: BLACK }}>APPEX CERTIFICATE</p>
                      <div className="w-7 h-7 -mt-2 -mr-1 flex items-center justify-center" style={{ background: ORANGE, clipPath: 'polygon(50% 0%, 61% 18%, 79% 13%, 81% 33%, 100% 39%, 89% 56%, 100% 73%, 81% 75%, 79% 95%, 61% 87%, 50% 100%, 39% 87%, 21% 95%, 19% 75%, 0% 73%, 11% 56%, 0% 39%, 19% 33%, 21% 13%, 39% 18%)' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                      </div>
                    </div>
                    <p className="text-[10px]" style={{ color: '#94A3B8' }}>Awarded to</p>
                    <p className="text-[11px] font-extrabold mb-1.5" style={{ color: BLACK }}>JAMES SMITH</p>
                    <div className="space-y-1 mb-3">
                      <div className="h-1 rounded-full w-full" style={{ background: '#E2E8F0' }} />
                      <div className="h-1 rounded-full w-[95%]" style={{ background: '#E2E8F0' }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-semibold" style={{ color: '#94A3B8' }}>ID · 342428</span>
                      <p className="text-[9px] font-extrabold">
                        <span style={{ color: BLACK }}>App</span><span style={{ color: ORANGE }}>ex</span>
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-[13px] font-semibold leading-snug mt-4" style={{ color: BLACK }}>A verifiable credential that holds weight on your CV and LinkedIn</p>
              </div>

            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center border-t pt-8" style={{ borderColor: '#E5E5E5' }}>
          <p className="text-[12px] mb-2" style={{ color: '#64748B' }}>
            By proceeding, you agree with{" "}
            <LegalLink href="/terms" className="underline" style={{ color: ORANGE }}>Terms and Conditions</LegalLink>,{" "}
            <LegalLink href="/privacy" className="underline" style={{ color: ORANGE }}>Privacy Policy</LegalLink>,{" "}
            <LegalLink href="/subscription" className="underline" style={{ color: ORANGE }}>Subscription Terms</LegalLink>
          </p>
          <p className="text-center mt-1 text-[12px]" style={{ color: '#94A3B8' }}>
            <span className="font-extrabold" style={{ color: BLACK }}>App</span><span className="font-extrabold" style={{ color: ORANGE }}>ex</span> Inc.
          </p>
        </footer>
      </div>

      {/* Sticky CTA */}
      {showStickyCta && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 py-3 border-t" style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)', borderColor: '#E5E5E5' }}>
          <button
            type="button"
            onClick={() => document.getElementById("plan-block")?.scrollIntoView({ behavior: "smooth" })}
            className="mx-auto block w-full max-w-[440px] py-3.5 rounded-2xl text-white font-bold text-[15px] border-none cursor-pointer tracking-wide"
            style={{ background: BLACK }}
          >
            Get Started
          </button>
        </div>
      )}
    </div>
  );
}

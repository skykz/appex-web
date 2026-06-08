import { useState, useEffect, useRef } from "react";
import { planIndexToId, submitLandingQuiz, updateLandingQuizPlan } from "@/lib/landing-api";
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

/* ── Laurel wreath ── */
function Laurel({ side }: { side: "left" | "right" }) {
  return (
    <svg width="32" height="52" viewBox="0 0 36 56" fill="none"
      style={{ transform: side === "right" ? "scaleX(-1)" : undefined }} aria-hidden>
      <path d="M30 4 C 14 12, 6 28, 8 52" stroke="#E0A91A" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      {[6, 13, 20, 27, 34, 41, 48].map((y, i) => {
        const x = 30 - i * 3.6; const rot = -55 + i * 6;
        return <ellipse key={i} cx={x} cy={y} rx="5.5" ry="2.6" fill="#F5C13A" stroke="#C68A0E" strokeWidth="0.8" transform={`rotate(${rot} ${x} ${y})`} />;
      })}
    </svg>
  );
}

/* ── Checkout Modal ── */
function CardForm() {
  return (
    <>
      <div className="space-y-4 mb-4 mt-2">
        <div>
          <label className="block text-[14px] font-semibold mb-2" style={{ color: BLACK }}>Card number</label>
          <div className="relative">
            <input placeholder="4111 1111 1111 1111" className="w-full rounded-xl px-4 py-3.5 text-[15px] outline-none focus:ring-2 focus:ring-orange-300 transition-all" style={{ background: '#F1F5F9', border: '1px solid transparent', color: '#111' }} />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-5 rounded" style={{ background: '#CBD5E1' }} />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[14px] font-semibold mb-2" style={{ color: BLACK }}>Expiry (MM/YY)</label>
            <input placeholder="MM/YY" className="w-full rounded-xl px-4 py-3.5 text-[15px] outline-none focus:ring-2 focus:ring-orange-300 transition-all" style={{ background: '#F1F5F9', border: '1px solid transparent', color: '#111' }} />
          </div>
          <div className="flex-1">
            <label className="block text-[14px] font-semibold mb-2" style={{ color: BLACK }}>CVV</label>
            <input placeholder="123" className="w-full rounded-xl px-4 py-3.5 text-[15px] outline-none focus:ring-2 focus:ring-orange-300 transition-all" style={{ background: '#F1F5F9', border: '1px solid transparent', color: '#111' }} />
          </div>
        </div>
      </div>
      <button className="w-full py-3.5 rounded-2xl text-white font-bold text-[15px] border-none cursor-pointer" style={{ background: '#111111', backgroundColor: '#111111', WebkitAppearance: 'none' }}>
        Complete Payment
      </button>
    </>
  );
}

function ApplePayBtn() {
  return (
    <button className="w-full py-4 rounded-2xl text-white font-bold text-[17px] border-none cursor-pointer mb-4 flex items-center justify-center gap-2" style={{ background: BLACK }}>
      Buy with
      <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden><path d="M17.5 12.6c0-2.4 2-3.5 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9-.8 0-1.9-.9-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 2.9 2.4 1.2 0 1.6-.8 3.1-.8s1.8.8 3.1.8c1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.5-.9-2.5-3.9zM15 5.2c.6-.8 1.1-1.9 1-3-1 0-2.1.6-2.8 1.4-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.6 2.8-1.3z"/></svg>
      Pay
    </button>
  );
}

function CheckoutModal({ onClose }: { onClose: () => void }) {
  const [showCard, setShowCard] = useState(false);
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
      <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-[480px] relative shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[20px] font-bold" style={{ color: BLACK }}>Complete checkout</h3>
          <button onClick={onClose} className="text-[18px] bg-transparent border-none cursor-pointer w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100" style={{ color: BLACK }} aria-label="Close">✕</button>
        </div>

        <ApplePayBtn />

        {/* Desktop: show card form directly. Mobile: toggle */}
        <div className="hidden md:block">
          <CardForm />
        </div>
        <div className="md:hidden">
          {!showCard ? (
            <button
              onClick={() => setShowCard(true)}
              className="w-full py-2 text-[14px] font-medium underline underline-offset-2 bg-transparent border-none cursor-pointer"
              style={{ color: '#475569' }}
            >
              Continue with other payment options
            </button>
          ) : (
            <CardForm />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Pricing Row ── */
function PricingRow({ label, was, now, perDayWas, perDay, popular, selected, onClick }: any) {
  const isDark = popular && selected;

  const inner = (
    <button
      onClick={onClick}
      className="relative w-full rounded-2xl px-4 py-3 text-left cursor-pointer transition-all flex items-center justify-between gap-3"
      style={{
        background: isDark ? BLACK : selected ? '#FFF7ED' : '#FAFAFA',
        border: isDark ? `2px solid ${BLACK}` : selected ? `2px solid ${ORANGE}` : '2px solid #E5E5E5',
      }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0"
          style={{ borderColor: selected ? (isDark ? 'white' : ORANGE) : '#D1D5DB', background: selected ? (isDark ? 'white' : ORANGE) : 'white' }}>
          {selected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isDark ? BLACK : "white"} strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[17px] font-extrabold leading-none" style={{ color: isDark ? 'white' : BLACK }}>{label}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: isDark ? ORANGE : '#FFF7ED', color: isDark ? 'white' : ORANGE }}>Save 71%</span>
          </div>
          <p className="text-[13px]" style={{ color: isDark ? 'rgba(255,255,255,0.65)' : '#6B7280' }}>
            <s>${was}</s> <span className="mx-1">→</span> <strong style={{ color: isDark ? 'white' : BLACK }}>${now}</strong>
          </p>
        </div>
      </div>
      <div className="flex-shrink-0 text-center px-4 py-2 rounded-xl min-w-[80px]"
        style={{ background: isDark ? 'rgba(255,255,255,0.12)' : '#F3F4F6' }}>
        <p className="text-[11px] line-through leading-none mb-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#94A3B8' }}>${perDayWas}</p>
        <p className="text-[22px] font-black leading-none" style={{ color: isDark ? 'white' : BLACK }}>${perDay}</p>
        <p className="text-[11px] mt-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#94A3B8' }}>per day</p>
      </div>
    </button>
  );

  if (popular) {
    return (
      <div className="rounded-2xl p-2 pt-3" style={{ background: '#FFF7ED', border: `1.5px solid #FED7AA` }}>
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span className="text-[13px]">🏆</span>
          <span className="text-[13px] font-bold" style={{ color: ORANGE }}>Most popular</span>
        </div>
        {inner}
      </div>
    );
  }
  return inner;
}

/* ── Apple Pay SVG ── */
function AppleLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden>
      <path d="M17.5 12.6c0-2.4 2-3.5 2.1-3.6-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.6.9-.8 0-1.9-.9-3.1-.8-1.6 0-3.1.9-3.9 2.4-1.7 2.9-.4 7.2 1.2 9.5.8 1.1 1.7 2.4 2.9 2.4 1.2 0 1.6-.8 3.1-.8s1.8.8 3.1.8c1.3 0 2.1-1.2 2.9-2.3.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.5-.9-2.5-3.9zM15 5.2c.6-.8 1.1-1.9 1-3-1 0-2.1.6-2.8 1.4-.6.7-1.2 1.8-1 2.9 1.1.1 2.2-.6 2.8-1.3z"/>
    </svg>
  );
}

/* ── Pricing Block ── */
function PricingBlock({ onGetPlan, selected, setSelected }: { onGetPlan: () => void; selected: number; setSelected: (i: number) => void }) {
  const plans = [
    { label: "1 Week", was: "17.77", now: "5.15", perDayWas: "2.54", perDay: "0.74" },
    { label: "4 Weeks", was: "38.95", now: "11.29", perDayWas: "1.39", perDay: "0.40" },
    { label: "12 Weeks", was: "66.65", now: "19.29", perDayWas: "0.79", perDay: "0.23" },
  ];
  const p = plans[selected];

  return (
    <div>
      {/* Features checklist */}
      <ul className="space-y-2 mb-3">
        {[
          "Build real projects — websites, apps, and more",
          "50+ bite-sized lessons & step-by-step personal plan",
          "Personal AI mentors and 24/7 support chat",
          "+7 AI tools: CV & Portfolio builder and more",
        ].map((t) => (
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
        {plans.map((plan, i) => (
          <PricingRow key={i} {...plan} popular={i === 1} selected={selected === i} onClick={() => setSelected(i)} />
        ))}
      </div>

      {/* Mobile: Apple Pay | Desktop: GET MY PLAN */}
      <button
        id="get-my-plan-btn"
        onClick={onGetPlan}
        className="animate-pulse-cta w-full py-4 rounded-2xl text-white font-bold text-[17px] border-none cursor-pointer mb-3 md:hidden flex items-center justify-center gap-2"
        style={{ background: BLACK }}
      >
        Buy with <AppleLogo /> Pay
      </button>
      <button
        id="get-my-plan-btn-desktop"
        onClick={onGetPlan}
        className="animate-pulse-cta w-full py-4 rounded-2xl text-white font-bold text-[17px] border-none cursor-pointer mb-3 hidden md:flex items-center justify-center tracking-wide"
        style={{ background: BLACK }}
      >
        GET MY PLAN
      </button>

      {/* Secondary: card payment — mobile only */}
      <button
        onClick={onGetPlan}
        className="md:hidden w-full py-2 text-[14px] font-medium underline underline-offset-2 bg-transparent border-none cursor-pointer mb-5"
        style={{ color: '#475569' }}
      >
        Continue with other payment options
      </button>
      <div className="hidden md:block mb-5" />

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-6 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <Laurel side="left" />
          <div className="text-center">
            <p className="text-[13px] font-bold" style={{ color: BLACK }}>4.5 excellent</p>
            <div className="flex gap-0.5 my-0.5">
              {[1,2,3,4,5].map(i => (
                <span key={i} className="text-[14px]" style={{ color: i === 5 ? '#D1D5DB' : '#F59E0B' }}>★</span>
              ))}
            </div>
          </div>
          <Laurel side="right" />
        </div>
        <div className="flex items-center gap-2">
          <Laurel side="left" />
          <div className="text-center">
            <p className="text-[14px] font-bold" style={{ color: BLACK }}>100K+ learners</p>
            <p className="text-[11px]" style={{ color: '#475569' }}>Learned new skills</p>
          </div>
          <Laurel side="right" />
        </div>
      </div>

      {/* Legal */}
      <div className="rounded-2xl p-3 border" style={{ background: 'white', borderColor: '#E5E5E5' }}>
        <p className="text-[11px] leading-relaxed text-center" style={{ color: '#94A3B8' }}>
          By clicking "Buy with Apple Pay", I agree to pay ${p.now} for a {p.label.toLowerCase()} introductory plan. Unless I cancel before it ends, Appex will automatically charge ${p.was} every {p.label.toLowerCase()}. I can cancel anytime from the subscription page in my account to avoid future charges.
        </p>
      </div>
    </div>
  );
}

export default function Paywall() {
  const [showCheckout, setShowCheckout] = useState(false);
  const [showStickyCta, setShowStickyCta] = useState(false);

  useEffect(() => {
    if (showCheckout) {
      document.body.classList.add("overlay-open");
    } else {
      document.body.classList.remove("overlay-open");
    }
    return () => document.body.classList.remove("overlay-open");
  }, [showCheckout]);
  const [selected, setSelected] = useState(1);
  const timer = useCountdown(10);
  const data = getQuizData();
  const quizEmail = (data.email as string | undefined)?.trim().toLowerCase();
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
  const goal = data.goal || "Start my own business";
  const hours = data.preferredHours || data.currentHours || "30 min/day";
  const barrier = data.stoppingYou || data.frustration || "Lack of free time";

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
        <span className="text-[14px] font-semibold" style={{ color: '#16A34A' }}>Start with 71% off</span>
        <span className="text-[14px] font-mono font-bold px-2.5 py-0.5 rounded-lg" style={{ background: '#86EFAC', color: '#064E3B' }}>{timer}</span>
      </div>

      <div className="mx-auto px-4 pb-20" style={{ maxWidth: 600 }}>

        {/* Section 1 — Headline + Pricing */}
        <section id="plan-block" className="pt-8 mb-6">
          <h1 className="text-[32px] md:text-[42px] font-extrabold text-center mb-7 leading-[1.1] tracking-tight" style={{ color: BLACK }}>
            Start mastering AI today with{" "}
            <span style={{ color: ORANGE }}>71% intro offer!</span>
          </h1>
          <PricingBlock onGetPlan={() => setShowCheckout(true)} selected={selected} setSelected={setSelected} />
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
              If you aren't happy with your course after giving it your full attention, we'll refund your purchase. You just need to email us at support@appex.me
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
            Your Appex <span style={{ color: ORANGE }}>Learning Plan</span> Is Ready
          </h2>
          <div className="rounded-3xl p-4 space-y-3 border" style={{ background: '#FFF7ED', borderColor: '#FED7AA' }}>
            <div className="rounded-2xl overflow-hidden bg-white p-3 border" style={{ borderColor: '#F3F4F6' }}>
              <img src={heroImg} alt="Your future self" className="mx-auto h-[150px] w-auto object-contain rounded-xl" style={{ background: '#F8FAFC' }} />
              <div className="text-center py-4">
                <p className="text-[13px] mb-1.5" style={{ color: '#6B7280' }}>Your goal</p>
                <p className="text-[15px] font-bold flex items-center justify-center gap-2" style={{ color: BLACK }}>
                  <span style={{ color: ORANGE }}>🎯</span> {goal}
                </p>
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center border" style={{ borderColor: '#F3F4F6' }}>
              <p className="text-[13px] mb-1.5" style={{ color: '#6B7280' }}>You're ready to invest</p>
              <p className="text-[15px] font-bold flex items-center justify-center gap-2" style={{ color: BLACK }}>
                <span style={{ color: ORANGE }}>⏱</span> {hours}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 text-center border" style={{ borderColor: '#F3F4F6' }}>
              <p className="text-[13px] mb-1.5" style={{ color: '#6B7280' }}>Your former barrier</p>
              <p className="text-[15px] font-bold flex items-center justify-center gap-2" style={{ color: BLACK }}>
                <span style={{ color: ORANGE }}>⚡</span> {barrier}
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border" style={{ background: '#ECFDF5', borderColor: '#D1FAE5' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2"><path d="M3 20h18M6 16V8m4 8V4m4 12v-6m4 6v-9"/></svg>
            <p className="text-[13px]" style={{ color: BLACK }}>
              Your AI potential score is better than <strong style={{ color: '#16A34A' }}>83%</strong> of learners
            </p>
          </div>
        </section>

        {/* Section 4 — See real impact */}
        <section className="mb-12">
          <h2 className="text-[26px] md:text-[30px] font-extrabold text-center mb-6 leading-tight" style={{ color: BLACK }}>
            See real impact of mastering{" "}
            <span className="italic" style={{ color: ORANGE }}>AI</span>
          </h2>
          <div className="rounded-3xl border overflow-hidden" style={{ borderColor: '#E5E5E5' }}>
            {[
              { icon: "💰", bold: "Earn more", rest: " by making AI fluency your competitive edge at work" },
              { icon: "🎤", bold: "Impress in every meeting", rest: " by delivering AI-backed insights and results" },
              { icon: "🏅", bold: "Get an Appex Mastery Certificate", rest: " that stands out on your LinkedIn & CV" },
              { icon: "⏳", bold: "Save 2+ hours a day", rest: " by letting AI handle writing, research, and analysis" },
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
            Hear it from Appex users
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
              Why Appex?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1 — Streak */}
              <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: '#F3F4F6' }}>
                <div className="h-[160px] rounded-xl flex flex-col items-center justify-center px-3" style={{ background: '#FFF7ED' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[40px] leading-none">🔥</span>
                    <span className="text-[40px] font-extrabold leading-none" style={{ color: ORANGE }}>3</span>
                  </div>
                  <div className="flex items-end gap-1.5">
                    {[{ d: 'Mon', on: true },{ d: 'Tue', on: true },{ d: 'Wed', on: true },{ d: 'Thr', on: false },{ d: 'Fri', on: false },{ d: 'Sat', on: false },{ d: 'Sun', on: false }].map((day) => (
                      <div key={day.d} className="flex flex-col items-center gap-1">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px]" style={{ background: day.on ? '#FED7AA' : '#E2E8F0' }}>
                          <span style={{ filter: day.on ? 'none' : 'grayscale(1) opacity(0.5)' }}>🔥</span>
                        </div>
                        <span className="text-[8px] font-semibold" style={{ color: '#475569' }}>{day.d}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-[13px] font-semibold leading-snug mt-4" style={{ color: BLACK }}>Gamified learning to help you build real habits that stick</p>
              </div>

              {/* Card 2 — Checklist */}
              <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: '#F3F4F6' }}>
                <div className="h-[160px] rounded-xl flex flex-col justify-center gap-3 px-6" style={{ background: '#F8FAFC' }}>
                  {[1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: '#22C55E' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                      </div>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: '#E2E8F0' }} />
                    </div>
                  ))}
                  <div className="flex items-center gap-3 relative">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 relative" style={{ background: ORANGE }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
                      <span className="absolute -top-4 -right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ background: '#FFF7ED', color: ORANGE }}>Start</span>
                    </div>
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: '#E2E8F0' }} />
                  </div>
                </div>
                <p className="text-[13px] font-semibold leading-snug mt-4" style={{ color: BLACK }}>Bite-sized lessons that fit into your busy schedule</p>
              </div>

              {/* Card 3 — AI workflow */}
              <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: '#F3F4F6' }}>
                <div className="min-h-[160px] h-auto rounded-xl flex flex-col items-center justify-center gap-1.5 px-3 overflow-hidden" style={{ background: '#F8FAFC' }}>
                  <div className="bg-white rounded-lg px-3 py-1.5 shadow-sm flex items-center gap-2 w-[140px]">
                    <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#FFF7ED' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>
                    </div>
                    <div>
                      <p className="text-[8px]" style={{ color: '#94A3B8' }}>Trigger</p>
                      <p className="text-[11px] font-bold" style={{ color: BLACK }}>Manual</p>
                    </div>
                  </div>
                  <svg width="2" height="10" viewBox="0 0 2 10"><line x1="1" y1="0" x2="1" y2="10" stroke="#94A3B8" strokeWidth="1" strokeDasharray="2 2"/></svg>
                  <div className="bg-white rounded-lg px-3 py-1.5 shadow-sm w-[140px]">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#FFF7ED' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 16h.01M16 16h.01"/></svg>
                      </div>
                      <div>
                        <p className="text-[8px]" style={{ color: '#94A3B8' }}>AI node</p>
                        <p className="text-[11px] font-bold" style={{ color: BLACK }}>AI Agent</p>
                      </div>
                    </div>
                  </div>
                  <svg width="2" height="10" viewBox="0 0 2 10"><line x1="1" y1="0" x2="1" y2="10" stroke="#94A3B8" strokeWidth="1" strokeDasharray="2 2"/></svg>
                  <div className="bg-white rounded-lg px-3 py-1.5 shadow-sm flex items-center gap-2 w-[140px]">
                    <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: '#FEF3C7' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2"><path d="M3 3h18l-2 9H5z"/><circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/></svg>
                    </div>
                    <p className="text-[11px] font-bold" style={{ color: BLACK }}>Flow</p>
                  </div>
                </div>
                <p className="text-[13px] font-semibold leading-snug mt-4" style={{ color: BLACK }}>No theory overload. Just practical, income-ready AI skills</p>
              </div>

              {/* Card 4 — Certificate */}
              <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: '#F3F4F6' }}>
                <div className="h-[160px] rounded-xl flex items-center justify-center p-4" style={{ background: '#FFF7ED' }}>
                  <div className="bg-white rounded-xl shadow-sm p-3 w-full relative">
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-[12px] font-extrabold tracking-wide" style={{ color: BLACK }}>CERTIFICATE</p>
                      <div className="w-8 h-8 -mt-3 -mr-2 flex items-center justify-center" style={{ background: ORANGE, clipPath: 'polygon(50% 0%, 61% 18%, 79% 13%, 81% 33%, 100% 39%, 89% 56%, 100% 73%, 81% 75%, 79% 95%, 61% 87%, 50% 100%, 39% 87%, 21% 95%, 19% 75%, 0% 73%, 11% 56%, 0% 39%, 19% 33%, 21% 13%, 39% 18%)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
                      </div>
                    </div>
                    <p className="text-[9px] font-bold mb-1" style={{ color: BLACK }}>DEAR USER</p>
                    <div className="h-px mb-2" style={{ background: '#E2E8F0' }} />
                    <div className="space-y-1 mb-3">
                      <div className="h-1 rounded-full w-full" style={{ background: '#E2E8F0' }} />
                      <div className="h-1 rounded-full w-[95%]" style={{ background: '#E2E8F0' }} />
                      <div className="h-1 rounded-full w-[80%]" style={{ background: '#E2E8F0' }} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-extrabold" style={{ color: BLACK }}>App</span>
                      <span className="text-[9px] font-extrabold" style={{ color: ORANGE }}>ex</span>
                    </div>
                  </div>
                </div>
                <p className="text-[13px] font-semibold leading-snug mt-4" style={{ color: BLACK }}>Official Appex Mastery Certificate — perfect for Upwork & your resume</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center border-t pt-8" style={{ borderColor: '#E5E5E5' }}>
          <p className="text-[12px] mb-2" style={{ color: '#64748B' }}>
            By proceeding, you agree with{" "}
            <a href="/terms" className="underline" style={{ color: ORANGE }}>Terms and Conditions</a>,{" "}
            <a href="/privacy" className="underline" style={{ color: ORANGE }}>Privacy Policy</a>,{" "}
            <a href="/subscription" className="underline" style={{ color: ORANGE }}>Subscription Terms</a>
          </p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="text-[12px] font-extrabold" style={{ color: BLACK }}>App</span>
            <span className="text-[12px] font-extrabold" style={{ color: ORANGE }}>ex</span>
            <span className="text-[12px]" style={{ color: '#94A3B8' }}> Inc.</span>
          </div>
        </footer>
      </div>

      {/* Sticky CTA */}
      {showStickyCta && (
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4 py-3 border-t" style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(8px)', borderColor: '#E5E5E5' }}>
          <button
            onClick={() => document.getElementById('plan-block')?.scrollIntoView({ behavior: 'smooth' })}
            className="mx-auto block w-full max-w-[440px] py-3.5 rounded-2xl text-white font-bold text-[15px] border-none cursor-pointer tracking-wide"
            style={{ background: BLACK }}
          >
            Get Started
          </button>
        </div>
      )}

      {showCheckout && <CheckoutModal onClose={() => setShowCheckout(false)} />}
    </div>
  );
}

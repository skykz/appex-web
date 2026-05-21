import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import paywallBefore from "@/assets/paywall-before.png";
import paywallAfter from "@/assets/paywall-after.png";
import paywallBeforeMale from "@/assets/paywall-before-male.png";
import paywallAfterMale from "@/assets/paywall-after-male.png";
import paywallChloe from "@/assets/paywall-chloe.jpg";
import paywallCarlos from "@/assets/paywall-carlos.jpg";
import paywallSophia from "@/assets/paywall-sophia.jpg";
import paywallHighlight from "@/assets/paywall-highlight.png";

/* ── Countdown Timer Hook ── */
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

/* ── Pricing Card ── */
function PricingCard({ weeks, was, now, perDayWas, perDay, popular, selected, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 rounded-2xl border-2 p-5 text-left cursor-pointer transition-all bg-white ${
        selected ? "border-[#2563EB] shadow-lg" : "border-[#E8E8E8]"
      }`}
    >
      {popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full text-[12px] font-semibold text-white flex items-center gap-1.5" style={{ background: '#2563EB' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
          Popular
        </div>
      )}
      <p className="text-[16px] font-bold mb-3" style={{ color: '#111' }}>{weeks}-week plan</p>
      {/* Radio indicator */}
      <div className="absolute top-5 right-5">
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selected ? 'border-[#2563EB] bg-[#2563EB]' : 'border-[#D1D5DB]'}`}>
          {selected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>}
        </div>
      </div>
      <p className="text-[13px] mb-3" style={{ color: '#999' }}>
        <s>${was}</s> → <strong style={{ color: '#111' }}>${now}</strong>
      </p>
      <div className="border-t pt-3" style={{ borderColor: '#E8E8E8' }}>
        <p className="text-[12px] mb-1" style={{ color: '#999' }}><s>${perDayWas}</s> →</p>
        <p className="flex items-baseline gap-1">
          <span className="text-[32px] font-black" style={{ color: '#111' }}>${perDay}</span>
          <span className="text-[13px]" style={{ color: '#888' }}>per day</span>
        </p>
      </div>
    </button>
  );
}

/* ── Pricing Section ── */
function PricingSection({ onGetPlan }: { onGetPlan: () => void }) {
  const [selected, setSelected] = useState(1);
  const timer = useCountdown(7);
  const data = getQuizData();
  const name = data.userName || "";
  const promoCode = `${(name || "user").toLowerCase()}_apr_2`;

  const plans = [
    { weeks: 1, was: "17.77", now: "5.15", perDayWas: "0.63", perDay: "0.74" },
    { weeks: 4, was: "38.95", now: "11.29", perDayWas: "1.39", perDay: "0.40" },
    { weeks: 12, was: "66.65", now: "19.29", perDayWas: "0.79", perDay: "0.23" },
  ];

  return (
    <div>
      {/* Social proof */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="flex -space-x-2">
          {[paywallChloe, paywallCarlos, paywallSophia].map((src, i) => (
            <img key={i} src={src} alt="" className="w-7 h-7 rounded-full border-2 border-white object-cover" />
          ))}
        </div>
        <span className="text-[13px]" style={{ color: '#666' }}><strong>122,584</strong> freelancers started with us</span>
      </div>

      <h3 className="text-[28px] md:text-[34px] font-bold text-center mb-6" style={{ color: '#111', lineHeight: 1.2 }}>
        {name ? `${name}, get` : "Get"} your <span style={{ color: '#2563EB' }}>Personalized Plan</span> to become AI-expert now!
      </h3>

      {/* Promo banner */}
      <div className="relative rounded-2xl border-2 p-4 mb-6" style={{ borderColor: '#22C55E', background: '#F0FDF4' }}>
        <div className="absolute -top-3 -right-3 flex flex-col items-center">
          <div className="bg-[#16A34A] text-white text-[10px] font-bold px-2 py-0.5 rounded-t-md">61%</div>
          <div className="bg-[#16A34A] text-white text-[14px] font-black px-3 py-1 rounded-b-lg" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 50% 100%, 0 85%)' }}>71% OFF</div>
        </div>
        <p className="text-[16px] font-bold mb-1" style={{ color: '#111' }}>New Promocode Applied!</p>
        <div className="flex items-center justify-between mt-3 rounded-xl border px-4 py-3" style={{ borderColor: '#D1FAE5', background: 'white' }}>
          <div>
            <p className="text-[11px]" style={{ color: '#999' }}>{promoCode}</p>
            <p className="text-[13px] font-mono flex items-center gap-1" style={{ color: '#111' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"><path d="M20 6L9 17l-5-5"/></svg>
              {promoCode}_final
            </p>
          </div>
          <div className="text-center border-l pl-4" style={{ borderColor: '#E5E5E5' }}>
            <p className="text-[20px] font-black font-mono" style={{ color: '#111' }}>{timer}</p>
            <p className="text-[10px]" style={{ color: '#999' }}>min &nbsp; sec</p>
          </div>
        </div>
      </div>

      {/* Plans */}
      <div className="flex gap-3 mb-5">
        {plans.map((p, i) => (
          <PricingCard key={i} {...p} popular={i === 1} selected={selected === i} onClick={() => setSelected(i)} />
        ))}
      </div>

      {/* CTA */}
      <button onClick={onGetPlan} className="w-full py-4 rounded-xl text-white font-bold text-[16px] border-none cursor-pointer mb-4 transition-transform hover:scale-[1.02]" style={{ background: '#2563EB' }}>
        GET MY PLAN
      </button>

      <div className="rounded-xl p-3 mb-4" style={{ background: '#F5F5F5' }}>
        <p className="text-[11px] text-center" style={{ color: '#999' }}>
          By clicking "Get My Plan", I agree to pay ${plans[selected].now} for a {plans[selected].weeks}-week introductory plan.
          Unless I cancel before it ends, Appex will automatically charge ${plans[selected].was} every {plans[selected].weeks} weeks.
          I can cancel anytime from the subscription page in my account to avoid future charges.
        </p>
      </div>

      {/* Payment methods */}
      <div className="flex flex-col items-center gap-3 mt-2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full border" style={{ borderColor: '#E5E5E5' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span className="text-[13px] font-semibold" style={{ color: '#16A34A' }}>Pay safe and secure</span>
        </div>
        <div className="flex items-center gap-2">
          {[
            { name: "Apple Pay", bg: "#000", color: "#fff", text: " Pay" },
            { name: "VISA", bg: "#1A1F71", color: "#fff", text: "VISA" },
            { name: "MC", bg: "#EB001B", color: "#fff", text: "" },
            { name: "Maestro", bg: "#0099DF", color: "#fff", text: "" },
            { name: "Discover", bg: "#FF6000", color: "#fff", text: "DISCOVER" },
            { name: "AMEX", bg: "#2E77BC", color: "#fff", text: "AMEX" },
          ].map((card) => (
            <div key={card.name} className="w-[48px] h-[32px] rounded-md flex items-center justify-center text-[9px] font-bold border" style={{ background: card.bg === "#000" ? "#fff" : card.bg, borderColor: '#E5E5E5', color: card.bg === "#000" ? "#000" : card.color }}>
              {card.text || card.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Review Card ── */
function ReviewCard({ initials, name, loc, stars, title, body, date }: any) {
  return (
    <div className="rounded-xl border p-5 mb-3" style={{ borderColor: '#E8E8E8' }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[13px] font-bold" style={{ background: '#2563EB' }}>{initials}</div>
        <div>
          <p className="text-[14px] font-semibold" style={{ color: '#111' }}>{name} | {loc}</p>
          <div className="flex gap-0.5">{Array.from({ length: stars }).map((_, i) => <span key={i} className="text-[13px]" style={{ color: '#F59E0B' }}>★</span>)}</div>
        </div>
      </div>
      <p className="text-[15px] font-semibold mb-2" style={{ color: '#111' }}>{title}</p>
      <p className="text-[13px] leading-relaxed mb-2" style={{ color: '#555' }}>{body}</p>
      <p className="text-[11px]" style={{ color: '#AAA' }}>Date of experience: {date}</p>
    </div>
  );
}

/* ── FAQ Item ── */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  return (
    <div className="border-b" style={{ borderColor: '#E0E0E0' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left bg-transparent border-none cursor-pointer"
      >
        <span className="text-[15px] font-semibold" style={{ color: '#111' }}>{question}</span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? contentRef.current?.scrollHeight : 0 }}
      >
        <p className="text-[13px] leading-relaxed pb-5" style={{ color: '#666' }}>{answer}</p>
      </div>
    </div>
  );
}

/* ── Checkout Modal ── */
function CheckoutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-[420px] mx-4 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-[18px] bg-transparent border-none cursor-pointer w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100" style={{ color: '#888' }}>✕</button>
        <h3 className="text-[20px] font-bold mb-6 text-center" style={{ color: '#111' }}>Complete checkout</h3>
        <div className="space-y-3 mb-6">
          <input placeholder="1234 1234 1234 1234" className="w-full rounded-xl border px-4 py-3.5 text-[15px] outline-none focus:border-[#2563EB] transition-colors" style={{ borderColor: '#E5E5E5' }} />
          <div className="flex gap-3">
            <input placeholder="MM / YY" className="flex-1 rounded-xl border px-4 py-3.5 text-[15px] outline-none focus:border-[#2563EB] transition-colors" style={{ borderColor: '#E5E5E5' }} />
            <input placeholder="CVC" className="w-[100px] rounded-xl border px-4 py-3.5 text-[15px] outline-none focus:border-[#2563EB] transition-colors" style={{ borderColor: '#E5E5E5' }} />
          </div>
        </div>
        <button className="w-full py-3.5 rounded-xl text-white font-bold text-[15px] border-none cursor-pointer transition-transform hover:scale-[1.02]" style={{ background: '#2563EB' }}>
          Confirm payment
        </button>
      </div>
    </div>
  );
}

export default function Paywall() {
  const navigate = useNavigate();
  const [showCheckout, setShowCheckout] = useState(false);
  const timer = useCountdown(7);
  const data = getQuizData();
  const name = data.userName || "Friend";
  const isMale = data.gender?.toLowerCase() === "male";
  const beforeImg = isMale ? paywallBeforeMale : paywallBefore;
  const afterImg = isMale ? paywallAfterMale : paywallAfter;

  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF' }}>
      {/* Progress bar at very top */}
      <div className="h-1 w-full" style={{ background: '#2563EB' }} />

      {/* Sticky navbar */}
      <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-5 h-[56px] bg-white" style={{ borderBottom: '1px solid #EBEBEB' }}>
        <span className="font-bold text-[18px]" style={{ color: '#111' }}>Appex</span>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-[11px]" style={{ color: '#888' }}>71% discount reserved for:</p>
            <p className="font-bold text-[18px] font-mono" style={{ color: '#111' }}>{timer}</p>
          </div>
          <button onClick={() => setShowCheckout(true)} className="px-5 py-2.5 rounded-lg text-white font-bold text-[13px] border-none cursor-pointer transition-transform hover:scale-105" style={{ background: '#2563EB' }}>
            GET MY PLAN
          </button>
        </div>
      </div>

      <div className="pt-[72px] pb-20 px-5 mx-auto" style={{ maxWidth: 780 }}>

        {/* Section 1 — Promo banner top */}
        <section className="mb-6">
          <div className="relative rounded-2xl border-2 p-4" style={{ borderColor: '#22C55E', background: '#F0FDF4' }}>
            <div className="absolute -top-3 -right-3 flex flex-col items-center">
              <div className="bg-[#16A34A] text-white text-[10px] font-bold px-2 py-0.5 rounded-t-md">61%</div>
              <div className="bg-[#16A34A] text-white text-[14px] font-black px-3 py-1.5 rounded-b-lg">71% OFF</div>
            </div>
            <p className="text-[16px] font-bold" style={{ color: '#111' }}>New promocode applied!</p>
            <p className="text-[13px] mt-0.5" style={{ color: '#555' }}>Get your personal plan with up <strong>71% discount</strong></p>
          </div>
        </section>

        {/* Section 2 — Hero Before/After */}
        <section className="mb-14">
          <h1 className="text-[32px] md:text-[40px] font-black text-center mb-8" style={{ color: '#111' }}>Your Freelancing Plan is ready!</h1>
          <div className="rounded-2xl overflow-hidden" style={{ background: '#F5F5F5' }}>
            {/* Now / Your goal tabs */}
            <div className="grid grid-cols-2 rounded-t-xl overflow-hidden" style={{ background: '#EBEBEB' }}>
              <div className="py-3 text-center font-semibold text-[14px]" style={{ color: '#888' }}>Now</div>
              <div className="py-3 text-center font-semibold text-[14px]" style={{ color: '#111' }}>Your goal</div>
            </div>
            {/* Photos */}
            <div className="grid grid-cols-2 items-end px-6 pt-6 pb-0 relative" style={{ minHeight: 280 }}>
              <div className="flex justify-center">
                <img src={beforeImg} alt="Before" className="h-[240px] md:h-[300px] object-contain" />
              </div>
              {/* Chevrons */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[20px] opacity-30" style={{ color: '#999' }}>›››</div>
              <div className="flex justify-center">
                <img src={afterImg} alt="After" className="h-[240px] md:h-[300px] object-contain" />
              </div>
            </div>
            {/* Status cards */}
            <div className="grid grid-cols-2 gap-3 p-4">
              <div className="bg-white rounded-xl p-4">
                <p className="text-[11px] flex items-center gap-1 mb-1" style={{ color: '#888' }}>✦ Status</p>
                <p className="text-[15px] font-bold mb-3" style={{ color: '#111' }}>9-5 office worker</p>
                <div className="border-t pt-3" style={{ borderColor: '#F0F0F0' }}>
                  <p className="text-[11px] mb-1" style={{ color: '#888' }}>Proficiency in AI tools</p>
                  <p className="text-[13px] font-bold mb-1.5" style={{ color: '#111' }}>LOW</p>
                  <div className="flex gap-1">
                    <div className="h-1 flex-1 rounded-full" style={{ background: '#2563EB' }} />
                    <div className="h-1 flex-1 rounded-full" style={{ background: '#D1D5DB' }} />
                    <div className="h-1 flex-1 rounded-full" style={{ background: '#D1D5DB' }} />
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4">
                <p className="text-[11px] flex items-center gap-1 mb-1" style={{ color: '#888' }}>🎯 Goal</p>
                <p className="text-[15px] font-bold mb-3" style={{ color: '#111' }}>Start freelancing with AI</p>
                <div className="border-t pt-3" style={{ borderColor: '#F0F0F0' }}>
                  <p className="text-[11px] mb-1" style={{ color: '#888' }}>Proficiency in AI tools</p>
                  <p className="text-[13px] font-bold mb-1.5" style={{ color: '#111' }}>HIGH</p>
                  <div className="flex gap-1">
                    <div className="h-1 flex-1 rounded-full" style={{ background: '#2563EB' }} />
                    <div className="h-1 flex-1 rounded-full" style={{ background: '#2563EB' }} />
                    <div className="h-1 flex-1 rounded-full" style={{ background: '#2563EB' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3 — Pricing */}
        <section className="mb-14">
          <PricingSection onGetPlan={() => setShowCheckout(true)} />
        </section>

        {/* Section 4 — Highlight of your plan */}
        <section className="mb-14">
          <h2 className="text-[28px] md:text-[34px] font-bold text-center mb-8" style={{ color: '#111' }}>Highlight of your plan</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: motivation card */}
            <div className="rounded-2xl p-6 relative overflow-hidden" style={{ background: '#E8F0FE' }}>
              <p className="text-[16px] font-bold mb-6" style={{ color: '#111' }}>You have everything to achieve results!</p>
              <div className="space-y-3 mb-6">
                {["No prior coding experience is needed", "No need for a university degree", "You can work at your own pace", "Full remote"].map((t) => (
                  <div key={t} className="bg-white rounded-xl px-4 py-3 text-[14px] font-medium" style={{ color: '#111' }}>{t}</div>
                ))}
              </div>
              <img src={paywallHighlight} alt="" className="w-[180px] mx-auto block" loading="lazy" />
            </div>
            {/* Right: week timeline + features */}
            <div>
              {/* Week timeline */}
              <div className="grid grid-cols-4 gap-0 rounded-xl overflow-hidden mb-8">
                {[
                  { week: "Week 1", title: "Foundation and Mindset" },
                  { week: "Week 2", title: "Master AI Agents" },
                  { week: "Week 3", title: "Find your first client" },
                  { week: "Week 4", title: "Make $2000 per project" },
                ].map((w, i) => (
                  <div key={w.week} className="py-3 px-2 text-center text-white" style={{ background: `hsl(220, ${70 + i * 5}%, ${50 - i * 5}%)` }}>
                    <p className="text-[10px] font-semibold opacity-80">{w.week}</p>
                    <p className="text-[11px] font-bold mt-1">{w.title}</p>
                  </div>
                ))}
              </div>
              {/* Features list */}
              <div className="space-y-5">
                {[
                  { icon: "🎬", title: "50+ lectures by TOP 1% AI Experts", desc: "You will get immediate access to videos in 5 different courses" },
                  { icon: "✨", title: "20+ AI Tools in one place!", desc: "Get access to ChatGPT, Gemini, Leonardo AI and other tools" },
                  { icon: "🔄", title: "Personal plan focused on rapid growth", desc: "Crafted by AI-experts to meet your situation and goals" },
                  { icon: "🗺️", title: "Step-By-Step Guides", desc: "Guides will help you build your freelancer profile" },
                  { icon: "🛡️", title: "Proven 5★ Freelancing Strategies", desc: "Implement strategies that makes our students $5K+/month" },
                ].map((f) => (
                  <div key={f.title} className="flex items-start gap-3">
                    <span className="text-[20px] mt-0.5">{f.icon}</span>
                    <div>
                      <p className="text-[14px] font-bold" style={{ color: '#111' }}>{f.title}</p>
                      <p className="text-[13px] mt-0.5" style={{ color: '#888' }}>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Section 5 — AI Tools Grid */}
        <section className="mb-14 rounded-2xl p-8" style={{ background: '#F5F5F5' }}>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="grid grid-cols-3 gap-3">
              {["ChatGPT", "Claude", "Midjourney", "Appex", "ElevenLabs", "Perplexity", "Gemini", "DALL·E", "Runway"].map((t) => (
                <div key={t} className="aspect-square rounded-2xl flex items-center justify-center text-[12px] font-bold shadow-sm" style={{ background: '#fff', color: '#111' }}>{t}</div>
              ))}
            </div>
            <div>
              <h3 className="text-[24px] md:text-[28px] font-bold mb-3" style={{ color: '#111' }}>Get access to 20+ AI Tools in one place</h3>
              <p className="text-[15px] leading-relaxed" style={{ color: '#888' }}>Stop overpaying for each model, enjoy all state-of-the-art models in one place.</p>
            </div>
          </div>
        </section>

        {/* Section 6 — Results */}
        <section className="mb-14">
          <h2 className="text-[28px] md:text-[34px] font-bold text-center mb-8" style={{ color: '#111' }}>Results that make us proud</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { img: paywallChloe, name: "Chloe, 26, Atlanta", body: "I used to work long hours at a job I didn't enjoy and barely made enough. Appex's step-by-step training helped me start building and selling AI chatbots. Now I earn more than I did at my 9–5 — and from home." },
              { img: paywallCarlos, name: "Carlos, 23, San Diego", body: "I used to spend hours chasing small gigs, but Appex changed everything. After learning to build AI agents, I landed 5 high-paying automation projects. It's the smartest move I've made as a freelancer." },
              { img: paywallSophia, name: "Sophia, 20, Boston", body: "I'm in college and already making real money thanks to Appex. My first AI chatbot earned me $700 in just a few days. The lessons are beginner-friendly and gave me real confidence in my future." },
            ].map((r) => (
              <div key={r.name} className="rounded-2xl border overflow-hidden" style={{ borderColor: '#E8E8E8' }}>
                <img src={r.img} alt={r.name} className="w-full h-[200px] object-cover" loading="lazy" />
                <div className="p-5">
                  <p className="text-[14px] font-bold mb-2" style={{ color: '#111' }}>{r.name}</p>
                  <p className="text-[13px] leading-relaxed" style={{ color: '#555' }}>{r.body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-center mt-4" style={{ color: '#AAA' }}>*Disclaimer: Following courses and guides is the key in freelancing journey and greatly impacts the results.</p>
        </section>

        {/* Section 6b — People often ask (FAQ) */}
        <section className="mb-14 py-12 -mx-5 px-5" style={{ background: '#F5F5F5' }}>
          <h2 className="text-[28px] md:text-[34px] font-bold text-center mb-8" style={{ color: '#111' }}>People often ask</h2>
          <div className="max-w-[680px] mx-auto">
            {[
              { q: "What happens after payment?", a: "After payment, you'll get instant access to your personalized freelancing plan, all 50+ video lectures, 20+ AI tools, and step-by-step guides. You can start learning and earning right away." },
              { q: "How can I make money using Appex?", a: "Appex teaches you to build AI-powered solutions like chatbots, automation workflows, and AI agents that businesses need. Our students typically land their first paying client within the first month." },
              { q: "How can I cancel my subscription?", a: "You can cancel anytime from your account's subscription page. No questions asked, no hidden fees. If you cancel within 30 days, you're eligible for a full refund." },
              { q: "I've tried many resources. Why Appex is better?", a: "Unlike generic courses, Appex gives you a personalized plan, access to 20+ AI tools in one place, and proven strategies specifically designed for freelancing. Our 4.6★ rating from 3,500+ reviews speaks for itself." },
            ].map((item, i) => (
              <FAQItem key={i} question={item.q} answer={item.a} />
            ))}
          </div>
        </section>

        {/* Section 7 — Trustpilot Reviews */}
        <section className="mb-14">
          <h2 className="text-[28px] font-bold text-center mb-8" style={{ color: '#111' }}>Here's what our freelancing heroes have to say</h2>
          <ReviewCard initials="SM" name="So M" loc="CA" stars={5} title="Exceeded expectations" body="This lesson gives you the idea of what to expect in this freelancing journey and how to prepare yourself for it. That's the base for everyone in the future." date="December 04, 2024" />
          <ReviewCard initials="BL" name="Briana L" loc="CA" stars={5} title="Why is freelancing a good source of income?" body="This company is great for people who are looking to find more income but aren't sure where to start. They have step by step lessons that guide you through the process from beginning to end..." date="December 04, 2024" />
        </section>

        {/* Section 8 — Stats + Second Pricing */}
        <section className="mb-14">
          <h2 className="text-[28px] font-bold text-center mb-5" style={{ color: '#111' }}>Join Thousands of Successful Freelancers</h2>
          <div className="grid grid-cols-2 gap-4 rounded-2xl border p-5 mb-8" style={{ borderColor: '#E8E8E8' }}>
            <div className="text-center">
              <p className="text-[24px] font-black" style={{ color: '#111' }}>🏆 120K+</p>
              <p className="text-[12px] mt-1" style={{ color: '#888' }}>users started freelancing with us</p>
            </div>
            <div className="text-center">
              <p className="text-[24px] font-black" style={{ color: '#111' }}>⭐ 4.6</p>
              <p className="text-[12px] mt-1" style={{ color: '#888' }}>out of 5 — 3,500+ reviews</p>
            </div>
          </div>
          <PricingSection onGetPlan={() => setShowCheckout(true)} />
        </section>

        {/* Section 9 — Guarantee */}
        <section className="mb-14">
          <div className="rounded-2xl border p-8 text-center" style={{ borderColor: '#E8E8E8' }}>
            <div className="mb-4 flex justify-center">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#E8F5E9" stroke="#16A34A" strokeWidth="1.5"/>
                <path d="M9 12l2 2 4-4" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-[24px] font-bold mb-4" style={{ color: '#111' }}>30-day Money-Back Guarantee</h2>
            <p className="text-[14px] leading-relaxed max-w-lg mx-auto" style={{ color: '#999' }}>
              We are so confident in our service that we are ready to offer a full refund within 30 days of purchase if you do not achieve initial results and can demonstrate you have followed the plan. Learn more about all the conditions in our <a href="#" className="underline" style={{ color: '#555' }}>Subscription Terms</a>.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center border-t pt-8 pb-4" style={{ borderColor: '#E8E8E8' }}>
          <p className="text-[12px] mb-3" style={{ color: '#AAA' }}>Appex Inc.</p>
          <div className="flex justify-center gap-4 text-[12px]" style={{ color: '#888' }}>
            <a href="#" className="hover:underline">Privacy</a>
            <a href="#" className="hover:underline">Terms</a>
          </div>
        </footer>
      </div>

      {showCheckout && <CheckoutModal onClose={() => setShowCheckout(false)} />}
    </div>
  );
}

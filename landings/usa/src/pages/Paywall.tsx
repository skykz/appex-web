import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { LegalLink } from "@/components/legal/LegalLink";
import CheckoutModal from "@/components/paywall/CheckoutModal";
import { planIndexToId, submitLandingQuiz, createLandingCheckout } from "@/lib/landing-api";
import { redirectToSigninCheckout } from "@/lib/checkout-redirect";
import { trackInitiateCheckout, getMetaBrowserIds } from "@/lib/meta-pixel";
import {
  ga4CheckoutStart,
  ga4PaywallView,
  ga4PaywallExitIntentShown,
  ga4PaywallTimerExpired,
  ga4PlanSelect,
  ga4CheckoutModalView,
  ga4CheckoutAbandon,
  ga4CheckoutError,
  ga4PaywallAbandon,
  getGa4ClientId,
} from "@/lib/ga4";
import { getPricingVariant } from "@/lib/pricing-variant";
import { pushToDataLayer } from "@/lib/gtm";
import { trackFunnelEvent, setFunnelDimensions } from "@/lib/quiz-tracker";
import { goalLabel, fearLabel, timeCommitmentLabel } from "@/lib/answer-labels";
import {
  PAYWALL_PLANS,
  visiblePlansFor,
  usesPerDayLayout,
  PAYWALL_DEFAULT_INDEX,
  PAYWALL_FEATURES,
  DISCOUNT_LABEL,
  ftcDisclosure,
  priceFor,
  perDayFor,
  perDayWasFor,
  PAYWALL_DEADLINE_KEY,
  isExitOfferUnlocked,
  markExitOfferUnlocked,
  type PaywallPlan,
  type DiscountState,
} from "@/lib/paywall-plans";
import paywallAfter from "@/assets/paywall-after.webp";
import paywallAfterMale from "@/assets/paywall-after-male.webp";
import paywallChloe from "@/assets/paywall-chloe.jpg";
import paywallCarlos from "@/assets/paywall-carlos.jpg";
import paywallSophia from "@/assets/paywall-sophia.jpg";

const ORANGE = "#F97316";
const BLACK = "#111";
/** Matches the "Start with 61% off" counter green at the top of the paywall. */
const GREEN = "#16A34A";

/* ── Countdown Timer ── */

/**
 * How long a burned offer stays burned. Within this window a refresh or a
 * reopened tab can't resurrect the discount; after it, a returning visitor
 * (typically from retargeting) is treated as a new funnel run and gets a fresh
 * countdown — otherwise the cheapest cohort would be permanently stuck on full
 * price for that device.
 */
const OFFER_RESET_MS = 24 * 60 * 60 * 1000;

/**
 * Counts down from `minutes`, persisting the absolute `deadline` in localStorage
 * so neither a refresh NOR closing and reopening the tab can resurrect an
 * offer that burned during this funnel run.
 */
function useCountdown(minutes: number) {
  const totalMs = minutes * 60 * 1000;

  const [secs, setSecs] = useState(() => {
    try {
      // Migrate any deadline written by the previous sessionStorage version so a
      // visitor mid-countdown at deploy time doesn't get the clock reset.
      const stored =
        localStorage.getItem(PAYWALL_DEADLINE_KEY) ??
        sessionStorage.getItem(PAYWALL_DEADLINE_KEY);
      const deadline = stored ? Number(stored) : NaN;
      if (Number.isFinite(deadline)) {
        // A deadline from an earlier visit shouldn't brand this device "expired"
        // forever — a retargeted lead returning days later must get a fresh
        // offer. Only honour a deadline from the current funnel run; anything
        // older than OFFER_RESET_MS starts over.
        const age = Date.now() - (deadline - totalMs);
        if (age <= OFFER_RESET_MS) {
          localStorage.setItem(PAYWALL_DEADLINE_KEY, String(deadline));
          return Math.max(0, Math.round((deadline - Date.now()) / 1000));
        }
      }
      localStorage.setItem(PAYWALL_DEADLINE_KEY, String(Date.now() + totalMs));
    } catch {
      /* storage disabled — fall back to a fresh in-memory countdown */
    }
    return minutes * 60;
  });

  useEffect(() => {
    if (secs <= 0) return;
    const iv = setInterval(() => setSecs((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(iv);
  }, [secs > 0]);

  const m = Math.floor(secs / 60).toString().padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return { label: `${m}:${s}`, expired: secs <= 0 };
}

/**
 * Fires once when the pointer leaves through the top of the viewport (classic
 * exit-intent). Desktop only — mouseout is unreliable on touch, so mobile keeps
 * the default offer rather than showing a discount that never triggers.
 */
function useExitIntent(onExit: () => void, enabled: boolean) {
  const firedRef = useRef(false);
  useEffect(() => {
    if (!enabled) return;
    if (window.matchMedia("(hover: none)").matches) return;

    const handler = (e: MouseEvent) => {
      if (firedRef.current) return;
      // relatedTarget is null when the cursor leaves the document entirely.
      if (e.clientY > 0 || e.relatedTarget) return;
      firedRef.current = true;
      onExit();
    };
    document.addEventListener("mouseout", handler);
    return () => document.removeEventListener("mouseout", handler);
  }, [enabled, onExit]);
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

/**
 * The "Certificate of Mastery" artwork, matching the quiz's certification step
 * (QuizOverlay S19) so the paywall shows the same credential the learner was
 * already sold on rather than a different mock.
 *
 * Scaled down from the quiz version to fit the "Why Appex" card: the quiz
 * renders it as a full-width step, here it sits in a 160px-tall tile.
 *
 * Deliberately shows a placeholder name, not the learner's: this is a sample of
 * the credential in a "why Appex" feature grid, so a real name would read as an
 * already-issued certificate rather than an illustration of what they'd earn.
 */
function CertificatePreview() {
  return (
    <div className="rounded-lg bg-white px-3 py-3 text-center w-full" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
      <div className="text-[10px] font-extrabold tracking-wide mb-2" style={{ color: BLACK }}>
        CERTIFICATE OF MASTERY
      </div>
      <div className="text-[7px] mb-1" style={{ color: '#94A3B8' }}>The certificate was awarded to</div>
      <div
        className="text-[9px] font-semibold tracking-wider pb-1 mx-auto"
        style={{ color: BLACK, borderBottom: '1px solid #E5E7EB', maxWidth: 150 }}
      >
        YOUR NAME
      </div>
      <div className="text-[6px] leading-snug mt-1.5 px-2" style={{ color: '#94A3B8' }}>
        Has successfully completed the advanced learning path <b>'Claude Master Certification'</b> and
        demonstrated deep expertise in effectively utilizing and integrating Claude.
      </div>
      <div className="flex justify-center my-1.5">
        <div
          className="w-7 h-7 flex items-center justify-center text-white text-[8px] font-bold leading-none"
          style={{
            background: ORANGE,
            clipPath:
              'polygon(50% 0%, 61% 8%, 73% 4%, 79% 15%, 91% 17%, 92% 30%, 100% 38%, 95% 50%, 100% 62%, 92% 70%, 91% 83%, 79% 85%, 73% 96%, 61% 92%, 50% 100%, 39% 92%, 27% 96%, 21% 85%, 9% 83%, 8% 70%, 0% 62%, 5% 50%, 0% 38%, 8% 30%, 9% 17%, 21% 15%, 27% 4%, 39% 8%)',
          }}
        >
          ✓
        </div>
      </div>
      <div className="flex justify-between items-end text-[6px]" style={{ color: '#94A3B8' }}>
        <span>7 November 2025</span>
        <span>ID: 342428523</span>
      </div>
    </div>
  );
}

/** Learner count badge (laurels) shown beneath subscription plan cards. */
function PaywallTrustBadges() {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-8 mb-4 flex-wrap">
      <div className="flex items-center gap-1.5 sm:gap-2">
        <Laurel side="left" />
        <div className="text-center">
          <p className="text-[13px] sm:text-[14px] font-bold leading-tight" style={{ color: BLACK }}>
            3241 learners
          </p>
          <p className="text-[10px] sm:text-[11px] mt-1" style={{ color: "#475569" }}>
            Learned new skills
          </p>
        </div>
        <Laurel side="right" />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <Laurel side="left" />
        <div className="text-center">
          <p className="text-[13px] sm:text-[14px] font-bold leading-tight" style={{ color: BLACK }}>
            47,567 tasks
          </p>
          <p className="text-[10px] sm:text-[11px] mt-1" style={{ color: "#475569" }}>
            Done with Claude
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
  state,
  perDayLayout,
}: {
  plan: PaywallPlan;
  selected: boolean;
  onClick: () => void;
  state: DiscountState;
  /** Per-day headline (new arm) vs cycle price (control). Part of the A/B. */
  perDayLayout: boolean;
}) {
  const price = priceFor(plan, state);
  const discounted = state !== "expired";
  // Spec: the "Most popular" card is always the black brand card, selected or not.
  const isDark = Boolean(plan.popular);
  // Split the per-day figure so the cents render small and raised next to a large
  // dollar figure ("$0⁴⁵/day"). Derived from the price actually charged, so it
  // can never drift from it.
  const perDay = (() => {
    const [whole, cents = "00"] = perDayFor(plan, state).split(".");
    return { whole, cents };
  })();

  const inner = (
    <button
      type="button"
      onClick={onClick}
      className="relative w-full rounded-2xl px-4 py-2.5 md:py-3 text-left cursor-pointer transition-all flex items-center justify-between gap-3"
      style={{
        background: isDark ? BLACK : selected ? '#FFF7ED' : 'white',
        // The black card keeps its brand fill whether or not it's chosen, so the
        // selected state is carried by an orange ring instead of the fill.
        border: isDark
          ? `2px solid ${selected ? ORANGE : BLACK}`
          : selected
            ? `2px solid ${ORANGE}`
            : '2px solid #E5E5E5',
      }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0"
          style={{
            borderColor: selected ? (isDark ? 'white' : ORANGE) : (isDark ? 'rgba(255,255,255,0.45)' : '#D1D5DB'),
            background: selected ? (isDark ? 'white' : ORANGE) : 'transparent',
          }}>
          {selected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={isDark ? BLACK : "white"} strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[17px] font-extrabold leading-none" style={{ color: isDark ? 'white' : BLACK }}>{plan.label}</span>
            {discounted && (
              // `badgeOverride` names the entry price instead of a percentage on
              // plans whose discount isn't a straight cut of their own full price
              // (day_1 is 97% off the 4-week base — a percentage there reads as a
              // scam and the shared label would be plain wrong).
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: isDark ? ORANGE : '#FFF7ED', color: isDark ? 'white' : ORANGE }}>
                {plan.badgeOverride ?? `Save ${DISCOUNT_LABEL[state]}`}
              </span>
            )}
          </div>
          {/* Sub-line under the label. In the per-day layout the headline number
              on the right is a derived figure, so the amount actually charged has
              to be stated plainly here. In the control layout the headline IS the
              charge, so this line carries the renewal terms instead — matching
              the paywall currently in production. */}
          <p className="text-[12px] leading-tight" style={{ color: isDark ? 'rgba(255,255,255,0.65)' : '#6B7280' }}>
            {perDayLayout ? (
              <>
                {discounted && !plan.badgeOverride && (
                  <>
                    <span className="line-through" style={{ color: isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8' }}>${plan.fullPrice}</span>
                    <span className="mx-1">→</span>
                  </>
                )}
                <span className="font-semibold" style={{ color: isDark ? 'white' : BLACK }}>${price}</span>
                {/* Entry plans state what happens next right on the card: the
                    price they're agreeing to is not the price they'll keep paying. */}
                {plan.badgeOverride && (
                  <span>, then ${plan.renewalPrice} {plan.renewalCadence}</span>
                )}
              </>
            ) : (
              <>${price} now, then auto-renews ${plan.renewalPrice} {plan.renewalCadence}</>
            )}
          </p>
        </div>
      </div>
      {perDayLayout ? (
        /* Price tag — the per-day figure, so plans of different lengths compare at
           a glance ($0.45/day vs $0.99/day). Shaped as a tag with a notched left
           edge (clip-path) to read as a price label rather than plain text. */
        <div
          className="flex-shrink-0 text-center py-2 pl-5 pr-3 -mr-1"
          style={{
            background: isDark ? 'rgba(255,255,255,0.12)' : selected ? '#FFEDD5' : '#F3F4F6',
            clipPath: 'polygon(14px 0, 100% 0, 100% 100%, 14px 100%, 0 50%)',
          }}
        >
          {/* Struck-through per-day "was" figure. Suppressed on plans whose full
              price spans a different period than one cycle of this plan: day_1's
              full price is the $38.95 4-week base, so dividing it by its 1 day
              would advertise "was $38.95/day", which is nonsense and reads as a
              lie. Those plans carry a badgeOverride instead. */}
          {discounted && !plan.badgeOverride && (
            <p className="text-[12px] line-through leading-none mb-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#9CA3AF' }}>
              ${perDayWasFor(plan)}
            </p>
          )}
          <p className="font-black leading-none" style={{ color: isDark ? 'white' : BLACK }}>
            <span className="text-[15px]">$</span>
            <span className="text-[27px]">{perDay.whole}</span>
            <span className="text-[15px]">.{perDay.cents}</span>
          </p>
          <p className="text-[10px] leading-none mt-1" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#6B7280' }}>
            per day
          </p>
        </div>
      ) : (
        /* Control layout: the cycle price as the headline with the struck-through
           full price beneath — the paywall as it ships today, kept byte-for-byte
           so the arm is a true baseline. */
        <div className="flex-shrink-0 text-right pl-2">
          <p className="text-[22px] font-black leading-none" style={{ color: isDark ? 'white' : BLACK }}>
            ${price}
          </p>
          {discounted && (
            <p className="text-[12px] line-through leading-none mt-1" style={{ color: isDark ? 'rgba(255,255,255,0.5)' : '#94A3B8' }}>
              ${plan.fullPrice}
            </p>
          )}
        </div>
      )}
    </button>
  );

  if (plan.popular) {
    // The wrapper only carries the orange highlight while this plan is actually
    // selected. Tinting it unconditionally made two cards look chosen at once
    // whenever the user picked a different plan.
    return (
      <div
        className="rounded-2xl p-2 pt-3 transition-colors"
        style={{
          background: selected ? '#FFF7ED' : 'transparent',
          border: `1.5px solid ${selected ? '#FED7AA' : '#E5E5E5'}`,
        }}
      >
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span className="text-[13px]">⭐</span>
          <span className="text-[13px] font-bold" style={{ color: selected ? ORANGE : '#6B7280' }}>
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
  onSelectPlan,
  checkoutLoading,
  state,
  visiblePlans,
  perDayLayout,
}: {
  onGetPlan: () => void;
  onSignIn: () => void;
  selected: number;
  /** Selects a plan AND reports it — see the paywall's handleSelectPlan. */
  onSelectPlan: (i: number) => void;
  checkoutLoading: boolean;
  state: DiscountState;
  /** Plans this visitor's A/B arm puts on sale, with their PAYWALL_PLANS index. */
  visiblePlans: { plan: PaywallPlan; index: number }[];
  /** Per-day card layout — on for the new arm, off for control. */
  perDayLayout: boolean;
}) {
  const plan = PAYWALL_PLANS[selected];

  return (
    <div>
      {/* Features checklist */}
      <ul className="space-y-1.5 md:space-y-2 mb-3">
        {PAYWALL_FEATURES.map((t) => (
          <li key={t} className="flex items-start gap-3 text-[13px]" style={{ color: BLACK }}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: '#FFF7ED' }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={ORANGE} strokeWidth="3.5"><path d="M20 6L9 17l-5-5"/></svg>
            </span>
            {t}
          </li>
        ))}
      </ul>

      {/* Pricing cards — the shelf for this visitor's A/B arm. */}
      <div className="space-y-2 mb-3">
        {visiblePlans.map(({ plan: p, index: i }) => (
          <PricingRow key={p.id} plan={p} selected={selected === i} onClick={() => onSelectPlan(i)} state={state} perDayLayout={perDayLayout} />
        ))}
      </div>

      {/* FTC-required negative-option disclosure (dynamic per plan). Sits ABOVE
          the CTA so the terms are read before the click that agrees to them —
          the disclosure has to precede consent, not follow it. */}
      <p className="text-center mb-3 leading-relaxed font-body text-[8px] md:text-[9px]" style={{ color: '#888888' }}>
        {ftcDisclosure(plan, state)}
      </p>

      {/* GET MY PLAN button — green (matches the top counter) with an iOS-style shimmer sweep */}
      <button
        id="get-my-plan-btn"
        type="button"
        onClick={onGetPlan}
        disabled={checkoutLoading}
        className="relative w-full py-4 rounded-2xl text-white font-bold text-[17px] border-none cursor-pointer mb-3 flex items-center justify-center gap-2 tracking-wide overflow-hidden shadow-lg shadow-[#16A34A]/30 transition-transform active:scale-[0.99] disabled:opacity-60"
        style={{ background: `linear-gradient(180deg, #22C55E 0%, ${GREEN} 100%)` }}
      >
        {/* iOS slide-to-unlock style light sweep */}
        {!checkoutLoading && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/35 to-transparent animate-[paywall-cta-slide_2.4s_ease-in-out_infinite] motion-reduce:hidden"
          />
        )}
        <span className="relative z-10 flex items-center gap-2">
          {checkoutLoading ? "Redirecting…" : "GET MY PLAN"}
        </span>
      </button>

      <p className="text-[13px] text-center mb-4">
        <button
          type="button"
          onClick={onSignIn}
          className="bg-transparent border-none cursor-pointer underline underline-offset-2"
          style={{ color: "#64748B" }}
        >
          I already have an account
        </button>
      </p>

      {/* Social proof sits AFTER the CTA: above it, it pushed the plan cards and
          the button below the fold on short mobile viewports. */}
      <PaywallTrustBadges />
    </div>
  );
}

export default function Paywall() {
  const [showStickyCta, setShowStickyCta] = useState(false);
  // Pricing A/B arm. Resolved once per mount and held: re-resolving mid-session
  // could swap the shelf under someone who has already picked a card.
  // Resolve the arm and stamp it onto the tracker in the SAME lazy initializer,
  // so it is recorded before any paywall event can fire. Doing it in an effect
  // instead would let paywall_view — the denominator of the whole experiment —
  // be attributed to the default arm.
  const [pricingVariant] = useState(() => {
    const variant = getPricingVariant();
    setFunnelDimensions({ pricingVariant: variant });
    return variant;
  });
  const visiblePlans = useMemo(() => visiblePlansFor(pricingVariant), [pricingVariant]);
  // Card layout is part of the arm, not a separate toggle: control must look
  // exactly like today's production paywall for the comparison to mean anything.
  const perDayLayout = usesPerDayLayout(pricingVariant);
  // Never start on a plan this arm doesn't sell — otherwise checkout could be
  // opened for a card that was never on screen.
  const [selected, setSelected] = useState(() => {
    const shelf = visiblePlansFor(getPricingVariant());
    const defaultOnShelf = shelf.some(({ index }) => index === PAYWALL_DEFAULT_INDEX);
    return defaultOnShelf ? PAYWALL_DEFAULT_INDEX : (shelf[0]?.index ?? PAYWALL_DEFAULT_INDEX);
  });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const timer = useCountdown(10);

  // Discount state machine: intro (61%) → exit-intent upgrade (71%) → expired (full price).
  // `expired` always wins: once the countdown runs out the offer is gone, and the
  // deadline is persisted so a reload can't resurrect it.
  //
  // `exitUnlocked` is seeded from persisted storage so the 71% tier survives a
  // reload (and the discount wheel clearing the timer). Purely in-memory before,
  // it silently downgraded returning 71% users back to 61%.
  const [exitUnlocked, setExitUnlocked] = useState(isExitOfferUnlocked);
  const discountState: DiscountState = timer.expired
    ? "expired"
    : exitUnlocked
      ? "exit"
      : "intro";

  const handleExitIntent = useCallback(() => {
    setExitUnlocked(true);
    markExitOfferUnlocked();
    // Spec §6: report the moment the 71% offer is revealed.
    ga4PaywallExitIntentShown();
    pushToDataLayer("paywall_exit_intent_shown", { discount_tier: "exit" });
  }, []);
  useExitIntent(handleExitIntent, !timer.expired && !exitUnlocked);

  const data = getQuizData();
  const quizEmail = (data.email as string | undefined)?.trim().toLowerCase();
  // The quiz stores the name under `userName` (StepName); keep `name` as a
  // fallback in case another entry path sets it.
  const quizName = ((data.userName ?? data.name) as string | undefined)?.trim();
  const planSavedRef = useRef<string | null>(null);
  const paywallViewFired = useRef(false);

  /* ── Paywall abandonment ─────────────────────────────────────────────────
     paywall_view says they arrived; nothing said whether they left empty-handed.
     max_scroll is what makes the result actionable: bouncing after reading the
     prices and never scrolling to them are opposite problems (pricing vs page
     structure) that otherwise look identical. */
  const paywallOpenedAt = useRef<number>(Date.now());
  const maxScrollPct = useRef(0);
  const openedCheckoutRef = useRef(false);
  const paywallAbandonFired = useRef(false);

  useEffect(() => {
    const track = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const pct = Math.round(((window.scrollY || doc.scrollTop) / scrollable) * 100);
      if (pct > maxScrollPct.current) maxScrollPct.current = Math.min(100, pct);
    };
    track();
    window.addEventListener("scroll", track, { passive: true });

    const onHidden = () => {
      if (document.visibilityState !== "hidden") return;
      if (paywallAbandonFired.current) return;
      paywallAbandonFired.current = true;
      const payload = {
        discount_tier: discountState,
        seconds_on_paywall: Math.round((Date.now() - paywallOpenedAt.current) / 1000),
        max_scroll: maxScrollPct.current,
        opened_checkout: openedCheckoutRef.current,
      };
      ga4PaywallAbandon(payload);
      pushToDataLayer("paywall_abandon", payload);
      trackFunnelEvent("paywall_abandon", payload);
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("scroll", track);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, [discountState]);

  // Fire paywall_view once on mount (spec funnel step 38, screen shown), tagged
  // with the discount state the visitor actually landed on (a reload after the
  // timer burned lands straight on `expired`).
  useEffect(() => {
    if (paywallViewFired.current) return;
    paywallViewFired.current = true;
    ga4PaywallView({ discount_tier: discountState });
    pushToDataLayer("paywall_view", { discount_tier: discountState });
    // Our own store too, so the funnel doesn't stop at the quiz.
    trackFunnelEvent("paywall_view", { discount_tier: discountState });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Spec §6: report when the countdown burns the discount. Only on a live
  // transition — a visitor who arrives already expired is covered by
  // paywall_view with discount_tier=expired, so we'd be double-counting.
  const arrivedExpired = useRef(timer.expired);
  const timerExpiredFired = useRef(false);
  useEffect(() => {
    if (arrivedExpired.current || !timer.expired || timerExpiredFired.current) return;
    timerExpiredFired.current = true;
    ga4PaywallTimerExpired();
    pushToDataLayer("paywall_timer_expired", { discount_tier: "expired" });
  }, [timer.expired]);

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
  // The overlay quiz stores slugs ("earn_more"), the route quiz stores readable
  // option text — translate the former, pass the latter through, so this block
  // never shows a raw slug right above the pricing cards.
  const goal = goalLabel(data.main_goal) || data.goal || "Start my own business";
  const hours =
    timeCommitmentLabel(data.daily_time_commitment) ||
    data.preferredHours ||
    data.currentHours ||
    "30 min/day";
  const barrier =
    fearLabel(data.primary_fear) || data.stoppingYou || data.frustration || "Lack of free time";

  /**
   * Opens the order-summary modal. The quiz-email guard runs here so the user
   * is redirected to the funnel before seeing a summary they can't act on.
   */
  // The discount tier as shown when the order summary opened. The modal honours
  // this snapshot, so the tier we charge and report matches the price the user
  // actually agreed to even if the countdown lapses while they read it.
  const shownTierRef = useRef<DiscountState>(discountState);
  const modalOpenedAt = useRef<number>(0);
  /**
   * Whether the open order summary ended in a redirect to Stripe. Guards against
   * counting a confirmed checkout as an abandonment, since confirming also
   * unmounts the modal.
   */
  const checkoutOutcome = useRef<"abandoned" | "confirmed">("abandoned");
  /** How many times the visitor changed plan — a hesitation signal. */
  const planSelectCount = useRef(0);

  /**
   * Switches the highlighted plan and reports it. The paywall opens on "4 Weeks",
   * so without this a purchase of the default is indistinguishable from a
   * deliberate choice — and repeated switches (select_index) show hesitation.
   */
  const handleSelectPlan = (i: number) => {
    if (i === selected) return;
    planSelectCount.current += 1;
    const plan = PAYWALL_PLANS[i];
    const payload = {
      plan: plan.id,
      discount_tier: discountState,
      select_index: planSelectCount.current,
    };
    ga4PlanSelect(payload);
    pushToDataLayer("plan_select", payload);
    trackFunnelEvent("plan_select", payload);
    setSelected(i);
  };

  const handleGetPlan = () => {
    if (checkoutLoading) return;
    if (!quizEmail) {
      window.alert("Please complete the quiz so we can set up your account.");
      window.location.href = "/";
      return;
    }
    shownTierRef.current = discountState;
    const plan = PAYWALL_PLANS[selected];
    modalOpenedAt.current = Date.now();
    checkoutOutcome.current = "abandoned";
    openedCheckoutRef.current = true;
    ga4CheckoutModalView({
      plan: plan.id,
      discount_tier: discountState,
      value: Number(priceFor(plan, discountState)),
    });
    trackFunnelEvent("checkout_modal_view", {
      plan: plan.id,
      discount_tier: discountState,
      value: Number(priceFor(plan, discountState)),
    });
    pushToDataLayer("checkout_modal_view", {
      plan: plan.id,
      discount_tier: discountState,
      value: Number(priceFor(plan, discountState)),
    });
    setCheckoutOpen(true);
  };

  /**
   * Reports dismissing the order summary without paying — the costliest drop in
   * the funnel, since the visitor already read the price and the renewal terms.
   * `checkoutOutcome` keeps a confirmed checkout from also counting as abandoned.
   */
  const handleCloseCheckout = () => {
    if (checkoutOutcome.current === "abandoned") {
      const plan = PAYWALL_PLANS[selected];
      const payload = {
        plan: plan.id,
        discount_tier: shownTierRef.current,
        value: Number(priceFor(plan, shownTierRef.current)),
        seconds_on_modal: Math.round((Date.now() - modalOpenedAt.current) / 1000),
        reason: "dismissed",
      };
      ga4CheckoutAbandon(payload);
      pushToDataLayer("checkout_abandon", payload);
      trackFunnelEvent("checkout_abandon", payload);
    }
    setCheckoutOpen(false);
  };

  const handleConfirmCheckout = async () => {
    if (checkoutLoading) return;
    // Charge and report the tier the order summary displayed, not a tier that
    // may have lapsed while the modal was open.
    const shownTier = shownTierRef.current;
    // No quiz email means the paywall was opened directly (fresh tab / bookmark)
    // without completing the funnel. Don't fire checkout events or create an
    // orphan Stripe session with an empty email — send them to collect an email.
    if (!quizEmail) {
      window.alert("Please complete the quiz so we can set up your account.");
      window.location.href = "/";
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
    ga4CheckoutStart({
      value: conversionValue,
      currency: "USD",
      plan: interval,
      discountTier: shownTier,
    });
    pushToDataLayer("checkout_start", {
      value: conversionValue,
      currency: "USD",
      plan: interval,
      discount_tier: shownTier,
    });
    // Persist the chosen plan/value so the success page fires the browser Purchase
    // with the same value the server reports. localStorage, NOT sessionStorage:
    // Stripe Checkout is a cross-origin round trip and mobile/in-app browsers
    // routinely return the user in a fresh tab, where sessionStorage is empty —
    // the success page would then report a fallback value for a real sale.
    try {
      localStorage.setItem(
        "appexCheckout",
        JSON.stringify({
          plan: interval,
          value: conversionValue,
          currency: "USD",
          // Carried to the success page so `purchase` reports which discount
          // tier actually sold (spec §6).
          discount_tier: shownTier,
        })
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
        discountTier: shownTier,
        meta: { event_id: eventId, fbp, fbc },
        ga4: { client_id: ga4ClientId },
      });

      if ("error" in result) {
        // A failed session is "we broke", not "they changed their mind" — report
        // it separately so a server-side outage is visible in the funnel instead
        // of just looking like missing purchases.
        ga4CheckoutError({ plan: interval, discount_tier: shownTier, message: String(result.error).slice(0, 120) });
        pushToDataLayer("checkout_error", { plan: interval, discount_tier: shownTier, message: String(result.error).slice(0, 120) });
        checkoutOutcome.current = "confirmed"; // not an abandonment
        // Drop back to the plan picker so the error isn't hidden behind the modal.
        setCheckoutOpen(false);
        window.alert(result.error);
        return;
      }
      // Redirecting to Stripe: stop the modal's unmount counting as abandonment.
      checkoutOutcome.current = "confirmed";
      window.location.href = result.url;
    } catch {
      // Network/CORS failure rejects the promise — surface it and re-enable the
      // button (the finally below) instead of leaving it stuck on "Redirecting…".
      ga4CheckoutError({ plan: interval, discount_tier: shownTier, message: "network_error" });
      pushToDataLayer("checkout_error", { plan: interval, discount_tier: shownTier, message: "network_error" });
      checkoutOutcome.current = "confirmed"; // an error, not an abandonment
      setCheckoutOpen(false);
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

  // Show the sticky CTA whenever the real button is off-screen — in either
  // direction. Two earlier attempts failed here:
  //   1. requiring `top < 0` (scrolled past) left short mobile viewports with no
  //      visible CTA at all, since the button starts *below* the fold;
  //   2. IntersectionObserver never fired its initial callback on this page, so
  //      the state stayed false until an unrelated re-render.
  // A direct rect check on scroll/resize is boring but always correct.
  useEffect(() => {
    const update = () => {
      const el = document.getElementById("get-my-plan-btn");
      if (!el) return;
      const r = el.getBoundingClientRect();
      const visible = r.bottom > 0 && r.top < window.innerHeight;
      setShowStickyCta(!visible);
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    // The button mounts with the rest of the page; re-check on the next frame in
    // case layout (fonts, images) shifts it after the first measurement.
    const raf = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF' }}>
      {/* Top sticky promo banner */}
      {discountState === "expired" ? (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-2 py-2.5 px-4" style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 2"/></svg>
          <span className="text-[14px] font-semibold" style={{ color: '#64748B' }}>Your intro offer has expired</span>
        </div>
      ) : (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-3 py-2.5 px-4" style={{ background: '#ECFDF5', borderBottom: '1px solid #D1FAE5' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
          <span className="text-[14px] font-semibold" style={{ color: '#16A34A' }}>Start with {DISCOUNT_LABEL[discountState]} off</span>
          <span className="text-[14px] font-mono font-bold px-2.5 py-0.5 rounded-lg" style={{ background: '#86EFAC', color: '#064E3B' }}>{timer.label}</span>
        </div>
      )}

      <div className="mx-auto px-4 pb-20" style={{ maxWidth: 600 }}>

        {/* Section 1 — Headline + Pricing */}
        {/* Tighter heading + spacing so the plan cards clear the fold on short
            mobile viewports — the offer should be visible without scrolling. */}
        <section id="plan-block" className="pt-5 md:pt-8 mb-4 md:mb-6">
          <h1 className="text-[24px] md:text-[36px] font-extrabold text-center mb-4 md:mb-6 leading-[1.15] tracking-tight" style={{ color: BLACK }}>
            {discountState === "expired" ? (
              <>
                Start mastering AI
                <br />
                today
              </>
            ) : (
              <>
                Start mastering AI today with{" "}
                <span style={{ color: ORANGE }}>{DISCOUNT_LABEL[discountState]} intro offer!</span>
              </>
            )}
          </h1>
          <PricingBlock
            onGetPlan={handleGetPlan}
            onSignIn={handleSignIn}
            selected={selected}
            onSelectPlan={handleSelectPlan}
            checkoutLoading={checkoutLoading}
            state={discountState}
            visiblePlans={visiblePlans}
            perDayLayout={perDayLayout}
          />
        </section>

        {/* Section 2 — Money-back guarantee */}
        {/* Sized down on phones and tablets: this is reassurance, not the offer, and
            at its old size it pushed the pricing further from the plan summary.
            The badge, padding and type all scale back up from `md`. The address is
            a real mailto rather than the inert <button> it used to be — the copy
            tells people to email, so the control should do it. */}
        <section className="mb-4 lg:mb-5">
          <div className="flex justify-center -mb-3 lg:-mb-4 relative z-10">
            <div className="w-6 h-6 lg:w-8 lg:h-8 flex items-center justify-center rounded-full border-2 border-white shadow-md" style={{ background: '#10B981' }}>
              <svg className="w-[11px] h-[11px] lg:w-3.5 lg:h-3.5" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
            </div>
          </div>
          <div className="rounded-xl lg:rounded-2xl px-2.5 py-2.5 pt-5 lg:p-4 lg:pt-7 text-center border" style={{ background: '#F8FAFC', borderColor: '#E5E5E5' }}>
            <h2 className="text-[10px] lg:text-[14px] font-extrabold mb-1 lg:mb-1.5" style={{ color: BLACK }}>Money-back guarantee</h2>
            <p className="text-[8px] lg:text-[8px] leading-snug lg:leading-relaxed mb-1.5 lg:mb-3" style={{ color: '#475569' }}>
              Not happy after really giving the course a go? Email us and we'll refund you.
            </p>
            <a
              href="mailto:hello@appexme.com"
              className="inline-flex items-center gap-1 px-2.5 lg:px-3.5 py-1 lg:py-1.5 rounded-full text-white font-semibold text-[8px] lg:text-[8px] no-underline"
              style={{ background: BLACK }}
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>
              Risk-free learning
            </a>
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

              {/* Card 4 — Certificate. Same artwork as the quiz's certification
                  step (QuizOverlay S19) so the paywall shows the learner the
                  exact credential they were already sold on. */}
              <div className="rounded-2xl p-5 bg-white border" style={{ borderColor: '#F3F4F6' }}>
                <div className="h-[160px] rounded-xl flex items-center justify-center p-3" style={{ background: '#FFF7ED' }}>
                  <CertificatePreview />
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
        {/* Section 7 — Support.
            Deliberately NOT another centred card with a badge above it: the
            money-back section already uses that shape, and repeating it makes the
            page read as two identical reassurance blocks. This one goes
            horizontal, uses the brand orange rather than a second green, and
            makes the address a real mailto so the promise is one tap away
            instead of a decorative pill that does nothing. */}
        <section className="mb-12">
          <div
            className="rounded-2xl lg:rounded-3xl border px-4 py-4 lg:p-6"
            style={{ background: '#FFF7ED', borderColor: '#FED7AA' }}
          >
            {/* Icon stays beside the text even on phones — stacking it added height
                without adding clarity, and this block should sit lighter than the
                guarantee above it, not heavier. */}
            <div className="flex items-start gap-3 lg:items-center lg:gap-4">
              <div
                className="flex h-9 w-9 lg:h-12 lg:w-12 shrink-0 items-center justify-center rounded-xl lg:rounded-2xl"
                style={{ background: ORANGE }}
              >
                <svg className="w-[17px] h-[17px] lg:w-[22px] lg:h-[22px]" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] lg:text-[20px] font-extrabold leading-tight" style={{ color: BLACK }}>
                  Stuck? A real person replies
                </h2>
                <p className="mt-1 text-[13px] lg:text-[14px] leading-snug lg:leading-relaxed" style={{ color: '#78350F' }}>
                  Not a bot — someone who knows the course, usually within a day.
                </p>
                <a
                  href="mailto:hello@appexme.com"
                  className="mt-2.5 lg:mt-3 inline-flex items-center gap-2 rounded-full px-4 lg:px-5 py-2 lg:py-2.5 text-[13px] lg:text-[14px] font-semibold text-white no-underline transition-transform active:scale-[0.99]"
                  style={{ background: BLACK }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="m22 7-10 6L2 7" />
                  </svg>
                  hello@appexme.com
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Order-summary modal — carries timer + discount to the final click */}
      <CheckoutModal
        open={checkoutOpen}
        plan={PAYWALL_PLANS[selected]}
        state={discountState}
        timerLabel={timer.label}
        loading={checkoutLoading}
        onClose={handleCloseCheckout}
        onConfirm={handleConfirmCheckout}
      />

      {/* Sticky CTA — mirrors the primary button (same label, colour and action)
          so the offer is always one tap away. `pb-[env(safe-area-inset-bottom)]`
          keeps it clear of the iOS home indicator. */}
      {showStickyCta && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 px-4 pt-3 border-t"
          style={{
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(8px)',
            borderColor: '#E5E5E5',
            paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
          }}
        >
          <button
            type="button"
            onClick={handleGetPlan}
            disabled={checkoutLoading}
            className="mx-auto flex items-center justify-center w-full max-w-[440px] py-3.5 rounded-2xl text-white font-bold text-[15px] border-none cursor-pointer tracking-wide shadow-lg shadow-[#16A34A]/30 transition-transform active:scale-[0.99] disabled:opacity-60"
            style={{ background: `linear-gradient(180deg, #22C55E 0%, ${GREEN} 100%)` }}
          >
            {checkoutLoading ? 'Redirecting…' : 'GET MY PLAN'}
          </button>
        </div>
      )}
    </div>
  );
}

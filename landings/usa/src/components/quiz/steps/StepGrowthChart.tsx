import { useEffect, useRef, useState } from "react";
import { useQuiz } from "@/contexts/QuizContext";
import ContinueButton from "../ContinueButton";

/** The growth curve, shared by the static and animated renders. */
const CURVE_PATH = "M 40 140 Q 96 135 152 115 Q 208 75 264 40 Q 292 25 320 15";

/** How long the curve takes to draw itself, in ms. */
const DRAW_MS = 1600;

/**
 * True when the visitor asked for reduced motion. Read once per mount rather
 * than subscribed to: the chart animates on entry only, so a mid-animation
 * preference change has nothing to re-run.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);
  return reduced;
}

function getTargetDate(timeHorizon: string): { label: string; monthsOut: number } {
  if (timeHorizon === "In the next 30 days") return { label: formatDate(30), monthsOut: 1 };
  if (timeHorizon === "1–3 months") return { label: formatDate(60), monthsOut: 2 };
  if (timeHorizon === "3–6 months") return { label: formatDate(120), monthsOut: 4 };
  return { label: formatDate(90), monthsOut: 3 };
}

function formatDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

const MILESTONES = [
  "First Claude workflow",
  "3 workflows built",
  "Portfolio ready",
  "Certification earned",
  "Job-ready",
];

const monthLabels = () => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return d.toLocaleDateString("en-US", { month: "short" });
  });
};

export default function StepGrowthChart() {
  const { answers, nextStep } = useQuiz();
  const { label: targetDate, monthsOut } = getTargetDate(answers.time_horizon);
  const careerGoal = answers.career_goal || "Your goal";
  const m = monthLabels();

  // goal line x position based on time horizon (out of 6 months)
  const goalX = 40 + Math.min(monthsOut, 5) * 56;
  // The label pill (76 wide) is centred on the line, but clamped so it stays
  // inside the 340-wide canvas. At the longest horizon goalX is 320, which
  // would push the pill to 358 — off-canvas and overlapping "Your Potential".
  const goalLabelX = Math.min(goalX, 340 - 38 - 2);

  const reducedMotion = usePrefersReducedMotion();
  const curveRef = useRef<SVGPathElement>(null);
  // Measured from the real path so the dash offset matches its true length —
  // hardcoding it would leave a visible gap or overshoot if the curve is edited.
  const [curveLength, setCurveLength] = useState<number | null>(null);
  const [drawing, setDrawing] = useState(false);

  useEffect(() => {
    const path = curveRef.current;
    if (!path) return;
    setCurveLength(path.getTotalLength());
    // Two frames: the first commits the "undrawn" state (offset === length), the
    // second flips it to 0 so the browser has something to transition between.
    // A single frame would paint the final state straight away with no animation.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setDrawing(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, []);

  // Until the length is measured, render the curve fully visible. Reduced motion
  // skips the reveal entirely rather than fast-forwarding it.
  const animate = !reducedMotion && curveLength !== null;
  const drawn = !animate || drawing;

  return (
    <div>
      <h2
        className="text-[22px] sm:text-[26px] font-extrabold mb-2 text-left leading-tight"
        style={{ color: '#111', WebkitTextFillColor: '#111' }}
      >
        Your Personal AI Skill Growth Plan
      </h2>
      <p className="text-[14px] text-left mb-3" style={{ color: '#555' }}>
        Based on your goal, you'll be job-ready with Claude by <strong>{targetDate}</strong>
      </p>
      <div className="flex items-center justify-start gap-2 mb-6 flex-wrap">
        <span className="text-[12px]" style={{ color: '#555' }}>Your big goal:</span>
        <span
          className="px-3 py-1 rounded-full text-[12px] font-semibold border"
          style={{ borderColor: '#F97316', color: '#F97316' }}
        >
          {careerGoal}
        </span>
      </div>

      {/* Chart */}
      <div
        className="rounded-2xl border p-3 sm:p-4 mb-6 overflow-hidden"
        style={{ borderColor: '#E5E5E5', background: '#FAFAFA' }}
      >
        <svg viewBox="0 0 340 185" preserveAspectRatio="xMidYMid meet" className="w-full h-auto block">
          <defs>
            <linearGradient id="growthGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="30%" stopColor="#F97316" />
              <stop offset="60%" stopColor="#EAB308" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {MILESTONES.map((_, i) => (
            <line
              key={i}
              x1="92" y1={140 - i * 27}
              x2="328" y2={140 - i * 27}
              stroke="#F0F0F0" strokeWidth="0.8"
            />
          ))}

          {/* Y-axis milestone labels — brighten bottom-up in step with the climb,
              so each milestone reads as "unlocked" as the curve passes it. */}
          {MILESTONES.map((label, i) => (
            <text
              key={label}
              x="88" y={143 - i * 27}
              fill="#AAA" fontSize="7.5" textAnchor="end"
              style={
                animate
                  ? {
                      opacity: drawn ? 1 : 0.25,
                      transition: `opacity 400ms ease ${(i / MILESTONES.length) * DRAW_MS}ms`,
                    }
                  : undefined
              }
            >
              {label}
            </text>
          ))}

          {/* X-axis month labels */}
          {m.map((label, i) => (
            <text
              key={label}
              x={40 + i * 56}
              y="178"
              fill="#AAA"
              fontSize="8"
              textAnchor="middle"
            >
              {label}
            </text>
          ))}

          {/* Vertical grid lines */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line
              key={i}
              x1={40 + i * 56} y1="10"
              x2={40 + i * 56} y2="148"
              stroke="#F0F0F0" strokeWidth="0.5"
            />
          ))}

          {/* Growth curve — draws itself left to right via a dash-offset sweep. */}
          <path
            ref={curveRef}
            d={CURVE_PATH}
            fill="none"
            stroke="url(#growthGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            style={
              animate
                ? {
                    strokeDasharray: curveLength as number,
                    strokeDashoffset: drawn ? 0 : (curveLength as number),
                    transition: `stroke-dashoffset ${DRAW_MS}ms cubic-bezier(0.33, 0.9, 0.3, 1)`,
                  }
                : undefined
            }
          />

          {/* Dot riding the head of the curve while it draws. */}
          {animate && (
            <circle r="4" fill="#22C55E" stroke="#fff" strokeWidth="1.5" opacity={drawn ? 0 : 1}
              style={{ transition: `opacity 300ms ease ${DRAW_MS - 250}ms` }}>
              <animateMotion dur={`${DRAW_MS}ms`} fill="freeze" path={CURVE_PATH}
                keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.33 0.9 0.3 1" />
            </circle>
          )}

          {/* Goal dashed line — fades in once the curve reaches it. */}
          <g
            style={
              animate
                ? {
                    opacity: drawn ? 1 : 0,
                    transition: `opacity 400ms ease ${DRAW_MS * 0.45}ms`,
                  }
                : undefined
            }
          >
            <line
              x1={goalX} y1="38"
              x2={goalX} y2="148"
              stroke="#111" strokeWidth="1" strokeDasharray="4 3"
            />
            {/* Clamped to the 340-wide canvas: at the far right the pill would
                otherwise run past the edge and collide with "Your Potential",
                which is pinned to the top-right corner. */}
            <rect x={goalLabelX - 38} y="0" width="76" height="16" rx="4" fill="#111" />
            <text x={goalLabelX} y="11" fill="#fff" fontSize="7" textAnchor="middle">
              Achieving your goal
            </text>
          </g>

          {/* Your Potential label — lands last, as the payoff of the climb. */}
          <g
            style={
              animate
                ? {
                    opacity: drawn ? 1 : 0,
                    transform: drawn ? 'scale(1)' : 'scale(0.8)',
                    transformOrigin: '302px 27px',
                    transition: `opacity 350ms ease ${DRAW_MS - 150}ms, transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1) ${DRAW_MS - 150}ms`,
                  }
                : undefined
            }
          >
            {/* Sits on its own row below the goal pill — both labels crowd the
                top-right corner at long time horizons. */}
            <rect x="276" y="20" width="52" height="14" rx="4" fill="#F97316" />
            <text x="302" y="30" fill="#fff" fontSize="7" textAnchor="middle">Your Potential</text>
          </g>
        </svg>
      </div>

      <ContinueButton onClick={nextStep} label="Continue →" />
    </div>
  );
}

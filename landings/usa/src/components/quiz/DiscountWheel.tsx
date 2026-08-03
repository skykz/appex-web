import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Segment labels, clockwise from the top (12 o'clock). The pointer sits at the
 * top, so index 0 is what's under it at rest.
 */
const SEGMENTS = [10, 27, 30, 41, 50, 61];
/** Index of the segment the pointer always ends on. */
const WINNING_INDEX = SEGMENTS.indexOf(61);
const SEG_ANGLE = 360 / SEGMENTS.length;

/* ---------------------------- Spin physics -------------------------------- */
/*
 * Stateful, step-integrated physics rather than a closed-form angle(t) curve —
 * because the wheel is interactive: every tap on the button while it's still
 * spinning adds angular velocity, the way flicking a real wheel again mid-spin
 * does. A time-parameterised profile can't express "the user just added energy
 * at an arbitrary moment", so instead each frame advances angle by the current
 * velocity and bleeds that velocity off under constant friction.
 *
 *   spin/tap:   velocity += KICK_DPS   (capped at MAX_DPS)
 *   each frame: angle    += velocity · dt
 *               velocity -= FRICTION_DPS2 · dt
 *   when velocity drops below LAND_VELOCITY, hand off to a short easing that
 *   settles exactly onto the winning segment (see landing logic in the loop).
 */
/** Velocity added per tap (first spin and every extra flick), deg/s. */
const KICK_DPS = 900;
/** Hard ceiling on velocity, so mashing the button can't spin it absurdly, deg/s. */
const MAX_DPS = 2600;
/** Constant friction deceleration, deg/s². */
const FRICTION_DPS2 = 380;
/** Below this speed the free spin ends and the landing ease begins, deg/s. */
const LAND_VELOCITY = 260;
/** Duration of the final ease onto the winning segment, ms. */
const LAND_MS = 900;
/** Peak velocity used only to normalise blur/kick strength to a 0..1 range. */
const PEAK_DPS = MAX_DPS;

/** Where the winning segment sits under the top pointer, mod 360. */
const TARGET_MOD = (-WINNING_INDEX * SEG_ANGLE + 360) % 360;

/** Smallest rotation ≥ `from` that lands the winning segment under the pointer,
 *  plus `extraTurns` full turns so the final ease still visibly travels. */
function landingTargetFrom(from: number, extraTurns: number): number {
  const base = Math.ceil((from - TARGET_MOD) / 360) * 360 + TARGET_MOD;
  const withGap = base < from + 1 ? base + 360 : base;
  return withGap + extraTurns * 360;
}

// Brand primary (matches C.primary in QuizOverlay.tsx / --primary in index.css)
// instead of an unrelated blue, so the wheel reads as part of the same product.
const PRIMARY = "#F97316";
const PRIMARY_DARK = "#C2410C";
const SEG_LIGHT = "#FFEDD5";
const SEG_DARK = "#FED7AA";

// Pre-negated via calc(): `-min(22vw, 88px)` is invalid CSS (a bare minus
// can't negate a min()/max() function), and an invalid value anywhere inside
// a `transform` drops the WHOLE transform — which is why labels and bulbs
// weren't just misplaced but rendered with no transform at all.
/** How far labels sit from the centre. Absolute so it can't resolve against
 *  the label's own box; scales with the wheel via the same clamp as the size. */
const LABEL_RADIUS_NEG = "calc(-1 * min(22vw, 88px))";
/** Radius of the decorative rim bulbs, measured from the wheel centre. */
const BULB_RADIUS_NEG = "calc(-1 * min(35.5vw, 146px))";

/**
 * The indicator flag at 12 o'clock, pointing down into the wheel.
 *
 * `deflection` is driven by the parent, not by a CSS animation: the flag is
 * physically pushed aside by each divider passing under it, so the kick has to
 * be timed to the wheel's actual rotation. A fixed-duration keyframe loop would
 * run at a constant rate while the wheel is visibly slowing down, which reads
 * as two unrelated animations rather than one object riding on another.
 */
function Pointer({ deflection }: { deflection: number }) {
  return (
    <div className="absolute left-1/2 top-0 z-20 -translate-x-1/2" aria-hidden="true">
      {/* Mounting pin, so the flag reads as hinged to the rim rather than floating. */}
      <div
        className="absolute left-1/2 top-0 size-[10px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: PRIMARY_DARK, boxShadow: "0 1px 2px rgba(0,0,0,0.35)" }}
      />
      <div
        style={{
          // Pivots at the pin, so it swings like a hinged flag instead of
          // sliding sideways.
          transformOrigin: "50% 0%",
          transform: `rotate(${deflection}deg)`,
          filter: "drop-shadow(0 4px 5px rgba(17,17,17,0.35))",
        }}
      >
        {/* Triangle drawn pointing DOWN: border-top (not border-bottom) is what
            puts the wide edge at the top and the tip at the bottom — verified
            against a plain reference triangle, since the two are easy to swap
            by assuming the property name matches the direction it draws. */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "10px solid transparent",
            borderRight: "10px solid transparent",
            borderTop: `36px solid ${PRIMARY_DARK}`,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Spinning discount wheel for the pre-paywall step.
 *
 * The wheel always lands on 61% — that is the intro discount every visitor
 * gets, so the outcome is fixed rather than random. The motion is simulated
 * rather than eased (see the physics block above): it spins up, coasts down
 * under constant friction, blurs while fast, and the pointer is knocked aside
 * by every divider that passes beneath it.
 *
 * `prefers-reduced-motion` skips straight to the result.
 */
export default function DiscountWheel({
  onSpinStart,
  onResult,
}: {
  onSpinStart?: () => void;
  onResult?: (percent: number) => void;
}) {
  const [rotation, setRotation] = useState(0);
  const [blur, setBlur] = useState(0);
  const [deflection, setDeflection] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [done, setDone] = useState(false);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

  // Live simulation state, kept in refs so the rAF loop mutates it without
  // triggering React renders (only the derived visuals — rotation/blur/
  // deflection — are state). `velocity` is what a tap adds to.
  const angleRef = useRef(0);
  const velocityRef = useRef(0);
  const phaseRef = useRef<"idle" | "free" | "landing">("idle");
  const lastFrameRef = useRef(0);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    []
  );

  const finish = useCallback(() => {
    setSpinning(false);
    setBlur(0);
    setDeflection(0);
    setDone(true);
    // Let the wheel visually come to rest before the popup covers it.
    timerRef.current = window.setTimeout(() => onResult?.(SEGMENTS[WINNING_INDEX]), 450);
  }, [onResult]);

  const spin = useCallback(() => {
    if (done) return;

    // A tap always adds energy, whether starting or already spinning — this is
    // what makes repeated taps flick the wheel faster. Once it's in the landing
    // ease, though, further taps are ignored: the result is locked in and
    // re-accelerating would fight the settle.
    if (phaseRef.current === "landing") return;

    velocityRef.current = Math.min(MAX_DPS, velocityRef.current + KICK_DPS);

    if (phaseRef.current !== "idle") return; // already running; the kick above is the whole effect

    setSpinning(true);
    onSpinStart?.();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      const target = landingTargetFrom(angleRef.current, 0);
      angleRef.current = target;
      setRotation(target);
      finish();
      return;
    }

    phaseRef.current = "free";
    lastFrameRef.current = performance.now();

    // Landing ease state, populated at the free→landing handoff.
    let landStart = 0;
    let landFrom = 0;
    let landTarget = 0;
    let lastDividerIndex = Math.floor(angleRef.current / SEG_ANGLE);
    let currentDeflection = 0;

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - lastFrameRef.current) / 1000); // clamp: a long frame gap can't teleport the wheel
      lastFrameRef.current = now;

      if (phaseRef.current === "free") {
        angleRef.current += velocityRef.current * dt;
        velocityRef.current = Math.max(0, velocityRef.current - FRICTION_DPS2 * dt);

        if (velocityRef.current <= LAND_VELOCITY) {
          // Hand off to a fixed-duration ease that ends exactly on 61%. One
          // extra turn keeps the landing from looking like an abrupt halt.
          phaseRef.current = "landing";
          landStart = now;
          landFrom = angleRef.current;
          landTarget = landingTargetFrom(landFrom, 1);
        }
      } else {
        // Landing: ease-out cubic from landFrom to landTarget over LAND_MS.
        const t = Math.min(1, (now - landStart) / LAND_MS);
        const eased = 1 - Math.pow(1 - t, 3);
        angleRef.current = landFrom + (landTarget - landFrom) * eased;
        if (t >= 1) {
          angleRef.current = landTarget;
          setRotation(landTarget);
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
          finish();
          return;
        }
      }

      const angle = angleRef.current;
      setRotation(angle);

      // Blur and pointer kicks scale with current speed. In the landing phase
      // velocityRef is frozen near LAND_VELOCITY, so derive speed from the
      // per-frame delta instead to keep both fading out smoothly.
      const speed =
        phaseRef.current === "free" ? velocityRef.current : Math.abs((landTarget - landFrom) / (LAND_MS / 1000));
      setBlur(Math.min(2.2, (velocityRef.current / PEAK_DPS) * 2.2));

      const dividerIndex = Math.floor(angle / SEG_ANGLE);
      if (dividerIndex !== lastDividerIndex) {
        lastDividerIndex = dividerIndex;
        currentDeflection = Math.min(14, (speed / PEAK_DPS) * 16);
      }
      currentDeflection *= 0.82;
      setDeflection(currentDeflection);

      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [done, onSpinStart, finish]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[min(78vw,320px)] aspect-square">
        <Pointer deflection={deflection} />

        {/* Rim with bulbs. Outside the rotating layer so the lights stay put. */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: PRIMARY,
            boxShadow: "0 10px 30px rgba(249,115,22,0.35), inset 0 -3px 8px rgba(0,0,0,0.15)",
          }}
        />
        {Array.from({ length: 12 }).map((_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 block size-[9px] rounded-full"
            style={{
              background: "#FFD36E",
              boxShadow: "0 0 6px rgba(255,211,110,0.9)",
              // Centre first (so the 50% offset resolves against this element's
              // own box, before any rotation), THEN rotate and push out by an
              // absolute radius — reversing this order sends every bulb to the
              // element's top-left corner instead of around the rim.
              transform: `translate(-50%, -50%) rotate(${i * 30}deg) translateY(${BULB_RADIUS_NEG})`,
            }}
          />
        ))}

        {/* Rotating face */}
        <div
          className="absolute rounded-full overflow-hidden"
          style={{
            inset: "16px",
            transform: `rotate(${rotation}deg)`,
            // Directional blur isn't available without SVG filters, but a small
            // uniform blur still sells speed and costs nothing.
            filter: blur > 0.05 ? `blur(${blur}px)` : undefined,
            willChange: "transform",
            // The rotation is stepped every frame from the physics model, so a
            // CSS transition here would interpolate on top of it and fight the
            // simulation for control of the same property.
            transition: "none",
          }}
        >
          {/* Wedges as one conic-gradient: hard colour stops every SEG_ANGLE
              give exact pie slices, where clip-path + skew wedges are easy to
              get subtly wrong and hard to keep aligned with the labels. The
              -SEG_ANGLE/2 offset centres segment 0 on the top pointer. */}
          <div
            className="absolute inset-0"
            style={{
              background: `conic-gradient(from ${-SEG_ANGLE / 2}deg, ${SEGMENTS.map(
                (_, i) =>
                  `${i % 2 === 0 ? SEG_LIGHT : SEG_DARK} ${i * SEG_ANGLE}deg ${(i + 1) * SEG_ANGLE}deg`
              ).join(", ")})`,
            }}
          />
          {/* Hairlines between wedges — without them adjacent same-tone slices
              (first and last, on an even count) read as one wide segment. */}
          {SEGMENTS.map((_, i) => (
            <div
              key={`divider-${i}`}
              aria-hidden="true"
              className="absolute left-1/2 top-0 h-1/2 w-px origin-bottom"
              style={{
                background: "rgba(255,255,255,0.75)",
                transform: `rotate(${i * SEG_ANGLE - SEG_ANGLE / 2}deg)`,
              }}
            />
          ))}
          {/* Labels sit above the gradient. Each is centred on the face, then
              pushed out along its segment's bisector. The offset must be an
              absolute length, not a percentage — a percentage here resolves
              against the label's own box (a few px) and stacks every label on
              the hub instead of spreading them around the rim. */}
          {SEGMENTS.map((pct, i) => (
            <div
              key={`label-${pct}`}
              className="absolute left-1/2 top-1/2 flex flex-col items-center"
              style={{
                transform: `translate(-50%, -50%) rotate(${i * SEG_ANGLE}deg) translateY(${LABEL_RADIUS_NEG}) rotate(${-i * SEG_ANGLE}deg)`,
              }}
            >
              <span className="text-[19px] font-extrabold leading-none" style={{ color: PRIMARY_DARK }}>
                {pct}%
              </span>
              <span className="text-[11px] font-semibold leading-none mt-0.5" style={{ color: PRIMARY_DARK }}>
                off
              </span>
            </div>
          ))}
        </div>

        {/* Hub */}
        <div
          className="absolute left-1/2 top-1/2 z-10 size-[58px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "#FFF7ED",
            boxShadow: "0 2px 6px rgba(0,0,0,0.18), inset 0 1px 2px rgba(255,255,255,0.9)",
          }}
        />
      </div>

      {/* Stays enabled while spinning: each tap adds another flick (see spin()).
          Only disabled once the wheel has settled and the result is locked. */}
      <button
        type="button"
        onClick={spin}
        disabled={done}
        className="mt-8 w-full rounded-full py-4 text-white font-semibold text-[16px] transition-opacity disabled:opacity-60"
        style={{ background: PRIMARY }}
      >
        {done ? "Done!" : spinning ? "Spin faster!" : "Start Wheel"}
      </button>
    </div>
  );
}

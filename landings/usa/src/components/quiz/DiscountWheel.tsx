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
 * A real wheel does two things an easing curve does not: it takes time to get
 * up to speed, and it slows under roughly constant friction rather than
 * asymptotically. A cubic ease-out gets both wrong — it starts at full speed
 * on frame one and then crawls for the last ~700ms.
 *
 * So the motion is integrated from an actual velocity profile:
 *   0..SPIN_UP_MS   quadratic ramp 0 -> PEAK_DPS   (a hand accelerating it)
 *   then            constant deceleration DECEL_DPS2 down to a dead stop
 *
 * The free-running distance that produces is then scaled by a fraction of a
 * percent so the wheel lands exactly on the winning segment. Scaling the whole
 * profile keeps the velocity SHAPE intact, where snapping the last few degrees
 * would reintroduce the artificial stop this replaces.
 */
/** Time spent accelerating from rest, ms. */
const SPIN_UP_MS = 300;
/** Peak angular velocity, deg/s. Sized so the free spin is ~7 turns. */
const PEAK_DPS = 1400;
/** Constant angular deceleration, deg/s². */
const DECEL_DPS2 = 400;

const SPIN_UP_S = SPIN_UP_MS / 1000;
/** Seconds spent decelerating from PEAK_DPS to zero. */
const DECEL_S = PEAK_DPS / DECEL_DPS2;
/** Total spin duration, ms. */
const SPIN_MS = (SPIN_UP_S + DECEL_S) * 1000;
/** Distance covered while accelerating: ∫ PEAK·(t/T)² dt = PEAK·T/3. */
const ACCEL_DEG = (PEAK_DPS * SPIN_UP_S) / 3;
/** Distance covered while decelerating: v²/2a. */
const DECEL_DEG = (PEAK_DPS * PEAK_DPS) / (2 * DECEL_DPS2);
const FREE_DEG = ACCEL_DEG + DECEL_DEG;
/** Where the winning segment must end up, mod 360. */
const TARGET_MOD = (-WINNING_INDEX * SEG_ANGLE + 360) % 360;
/** Nearest whole-turn multiple of the free distance that lands on target. */
const TOTAL_DEG = Math.round((FREE_DEG - TARGET_MOD) / 360) * 360 + TARGET_MOD;
/** Correction factor, ~0.4% — small enough not to distort the deceleration. */
const SCALE = TOTAL_DEG / FREE_DEG;

/** Angular position at time t (ms), following the profile above. */
function angleAt(ms: number): number {
  const t = Math.min(ms, SPIN_MS) / 1000;
  if (t <= SPIN_UP_S) {
    // ∫ PEAK·(t/T)² dt = PEAK·t³/(3T²)
    return (SCALE * (PEAK_DPS * t * t * t)) / (3 * SPIN_UP_S * SPIN_UP_S);
  }
  const td = t - SPIN_UP_S;
  return SCALE * (ACCEL_DEG + PEAK_DPS * td - 0.5 * DECEL_DPS2 * td * td);
}

/** Angular velocity at time t (ms), deg/s — drives blur and pointer kicks. */
function velocityAt(ms: number): number {
  const t = Math.min(ms, SPIN_MS) / 1000;
  if (t <= SPIN_UP_S) return SCALE * PEAK_DPS * (t / SPIN_UP_S) ** 2;
  return SCALE * Math.max(0, PEAK_DPS - DECEL_DPS2 * (t - SPIN_UP_S));
}

const BLUE = "#3B5BFF";
const BLUE_DARK = "#1E3AE0";
const SEG_LIGHT = "#DCE4FF";
const SEG_DARK = "#C8D4FF";

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
        style={{ background: BLUE_DARK, boxShadow: "0 1px 2px rgba(0,0,0,0.35)" }}
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
            borderTop: `36px solid ${BLUE_DARK}`,
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

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    []
  );

  const spin = useCallback(() => {
    if (spinning || done) return;
    setSpinning(true);
    onSpinStart?.();

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setRotation(TOTAL_DEG);
      setSpinning(false);
      setDone(true);
      onResult?.(SEGMENTS[WINNING_INDEX]);
      return;
    }

    let settled = false;
    const settle = (withDelay: boolean) => {
      if (settled) return;
      settled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setRotation(TOTAL_DEG);
      setBlur(0);
      setDeflection(0);
      setSpinning(false);
      setDone(true);
      if (withDelay) {
        // Let the wheel visually come to rest before the popup covers it.
        timerRef.current = window.setTimeout(
          () => onResult?.(SEGMENTS[WINNING_INDEX]),
          450
        );
      } else {
        onResult?.(SEGMENTS[WINNING_INDEX]);
      }
    };

    const start = performance.now();
    // Tracks which divider was last under the pointer, so each one produces
    // exactly one kick no matter how many frames it spans.
    let lastDividerIndex = Math.floor(angleAt(0) / SEG_ANGLE);
    // Deflection decays frame to frame; a kick adds to it, springing back to 0.
    let currentDeflection = 0;

    const step = (now: number) => {
      const elapsed = now - start;
      const angle = angleAt(elapsed);
      const velocity = velocityAt(elapsed);

      setRotation(angle);

      // Motion blur proportional to speed. Capped low: past ~2px the segment
      // labels turn to mush and it stops reading as a wheel at all.
      setBlur(Math.min(2.2, (velocity / PEAK_DPS) * 2.2));

      // Each divider that sweeps past the pointer knocks it aside; the kick is
      // proportional to speed, so it's violent at the start and a gentle nudge
      // by the end — which is exactly how the wheel's own motion is changing.
      const dividerIndex = Math.floor(angle / SEG_ANGLE);
      if (dividerIndex !== lastDividerIndex) {
        lastDividerIndex = dividerIndex;
        currentDeflection = Math.min(14, (velocity / PEAK_DPS) * 16);
      }
      // Spring back toward rest between kicks.
      currentDeflection *= 0.82;
      setDeflection(currentDeflection);

      if (elapsed < SPIN_MS) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        settle(true);
      }
    };
    rafRef.current = requestAnimationFrame(step);

    // Safety net: browsers throttle or fully suspend rAF in a backgrounded
    // tab (switched app, minimized window), which would otherwise strand the
    // wheel mid-spin with the button disabled forever. setTimeout still fires
    // (throttled, not frozen) in that state, so this guarantees the spin
    // resolves — skipping the settle flourish, but landing correctly — even if
    // the tab never becomes visible again during the animation.
    window.setTimeout(() => settle(false), SPIN_MS + 2000);
  }, [spinning, done, onSpinStart, onResult]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[min(78vw,320px)] aspect-square">
        <Pointer deflection={deflection} />

        {/* Rim with bulbs. Outside the rotating layer so the lights stay put. */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: BLUE,
            boxShadow: "0 10px 30px rgba(59,91,255,0.35), inset 0 -3px 8px rgba(0,0,0,0.15)",
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
              <span className="text-[19px] font-extrabold leading-none" style={{ color: BLUE_DARK }}>
                {pct}%
              </span>
              <span className="text-[11px] font-semibold leading-none mt-0.5" style={{ color: BLUE_DARK }}>
                off
              </span>
            </div>
          ))}
        </div>

        {/* Hub */}
        <div
          className="absolute left-1/2 top-1/2 z-10 size-[58px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: "#EEF2FF",
            boxShadow: "0 2px 6px rgba(0,0,0,0.18), inset 0 1px 2px rgba(255,255,255,0.9)",
          }}
        />
      </div>

      <button
        type="button"
        onClick={spin}
        disabled={spinning || done}
        className="mt-8 w-full rounded-full py-4 text-white font-semibold text-[16px] transition-opacity disabled:opacity-60"
        style={{ background: BLUE }}
      >
        {spinning ? "Spinning…" : done ? "Done!" : "Start Wheel"}
      </button>
    </div>
  );
}

import { useEffect, useRef } from "react";

const COLORS = ["#F97316", "#FBBF24", "#16A34A", "#3B82F6", "#EC4899"];
const PIECE_COUNT = 140;
const STAGGER_PX = 120;
const MIN_SPEED = 4;
const MAX_SPEED = 7;
// Last second of any piece's fall is a fade-out, so the burst dissolves
// instead of vanishing edge-to-edge the instant it clears the bottom.
const FADE_MS = 1000;

interface Piece {
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  drift: number;
  rotation: number;
  spin: number;
}

/**
 * One-shot confetti that falls from the top of the viewport, used on the
 * post-payment success page. Canvas + rAF instead of a library: the only thing
 * needed here is "pieces fall down and fade", not a general particle system.
 *
 * Respects prefers-reduced-motion by rendering nothing.
 */
export default function ConfettiBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // A small random stagger just above the viewport so pieces don't fall in
    // one hard visible line. Kept small (not spread across the full window
    // height) purely for pacing — the actual end of the animation no longer
    // depends on it, since the loop below runs until every piece lands.
    const pieces: Piece[] = Array.from({ length: PIECE_COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: -20 - Math.random() * STAGGER_PX,
      size: 6 + Math.random() * 6,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speed: MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED),
      drift: (Math.random() - 0.5) * 1.5,
      rotation: Math.random() * 360,
      spin: (Math.random() - 0.5) * 8,
    }));

    let rafId: number;

    const frame = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      let anyVisible = false;
      for (const p of pieces) {
        // No wrap-around: a piece past the bottom edge just stops drawing, so
        // the burst actually finishes falling instead of looping into an
        // indefinite snowfall. Ending on "distance to the bottom" rather than
        // a fixed timer means this holds at any viewport height, instead of
        // guessing a duration long enough for the slowest piece to land.
        const distanceToBottom = window.innerHeight + 20 - p.y;
        if (distanceToBottom <= 0) continue;
        anyVisible = true;

        // Fade only once a piece is within its last FADE_MS of travel, so nothing
        // dims until it's actually about to land.
        const framesLeft = distanceToBottom / p.speed;
        const msLeft = (framesLeft / 60) * 1000;
        ctx.globalAlpha = msLeft < FADE_MS ? Math.max(0, msLeft / FADE_MS) : 1;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();

        p.y += p.speed;
        p.x += p.drift;
        p.rotation += p.spin;
      }

      if (anyVisible) {
        rafId = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      }
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50"
    />
  );
}

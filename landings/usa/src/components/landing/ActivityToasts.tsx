import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Rotating live-activity toasts in the bottom-left corner.
 *
 * Shows randomized, plausible-looking activity from other learners (first name
 * + last initial, an action, and a relative timestamp). Purely presentational —
 * no real data. Each appearance picks a fresh name/action/time combo so it never
 * looks like a canned, repeating fake. Actions are landing-relevant (learners
 * who haven't signed up yet): getting a plan, starting projects, working tasks.
 */

const FIRST_NAMES = [
  "James", "Emma", "Liam", "Olivia", "Noah", "Ava", "Ethan", "Sophia",
  "Mason", "Isabella", "Lucas", "Mia", "Logan", "Charlotte", "Jack",
  "Amelia", "Daniel", "Harper", "Henry", "Evelyn", "Owen", "Abigail",
  "Sebastian", "Ella", "Jackson", "Grace", "Aiden", "Chloe", "Matthew",
  "Lily", "David", "Zoe", "Ryan", "Nora", "Nathan", "Hannah", "Isaac",
  "Layla", "Caleb", "Aria", "Julian", "Scarlett", "Leo", "Victoria",
];

const LAST_INITIALS = [
  "S.", "M.", "K.", "R.", "B.", "T.", "L.", "H.", "P.", "C.",
  "D.", "W.", "G.", "F.", "N.", "J.", "A.", "V.", "Z.", "O.",
];

const ACTIONS = [
  "just got their personalized learning plan",
  "started building their first Claude project",
  "just started the free quiz",
  "unlocked their AI career roadmap",
  "is working through today's tasks",
  "enrolled in the Claude program",
  "completed their first hands-on lesson",
  "hit a 7-day learning streak",
  "shared their certificate on LinkedIn",
  "earned their first project badge",
];

type Toast = {
  key: number;
  name: string;
  action: string;
  minutesAgo: number;
};

function randomOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function timeAgo(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes === 1) return "1 minute ago";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}

/**
 * Builds a fresh toast whose (name + action) combo hasn't been shown recently.
 * `recent` is a rolling set of the last N combos; we re-roll until we find one
 * that isn't in it, so the stream runs forever without visible repeats.
 */
function buildToast(key: number, recent: Set<string>): Toast {
  let name = "";
  let action = "";
  let combo = "";
  // Bounded retries: the combo space (44×20×10) dwarfs the recent window,
  // so a fresh pick is found almost immediately; the cap just guarantees we
  // never loop forever in a pathological case.
  for (let i = 0; i < 40; i++) {
    name = `${randomOf(FIRST_NAMES)} ${randomOf(LAST_INITIALS)}`;
    action = randomOf(ACTIONS);
    combo = `${name}|${action}`;
    if (!recent.has(combo)) break;
  }
  return {
    key,
    name,
    action,
    minutesAgo: Math.floor(Math.random() * 34) + 1, // 1–34 min ago
  };
}

export default function ActivityToasts() {
  const [toast, setToast] = useState<Toast | null>(null);
  const [visible, setVisible] = useState(false);
  const counter = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Rolling window of recently shown (name+action) combos to avoid repeats.
  const recent = useRef<string[]>([]);

  // Respect reduced-motion opt-out.
  const enabled = useMemo(() => {
    if (typeof window === "undefined") return false;
    return !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const pending = timers.current;

    const showOne = () => {
      if (cancelled) return;
      counter.current += 1;
      const next = buildToast(counter.current, new Set(recent.current));
      // Remember this combo; keep the window to the last 20 so it never repeats
      // anything on screen recently but the pool eventually recycles.
      recent.current.push(`${next.name}|${next.action}`);
      if (recent.current.length > 20) recent.current.shift();
      setToast(next);
      setVisible(true);

      // Visible ~5s, then hide and schedule the next after a random gap.
      pending.push(
        setTimeout(() => {
          if (cancelled) return;
          setVisible(false);
          const gap = 8000 + Math.random() * 7000; // 8–15s between toasts
          pending.push(setTimeout(showOne, gap));
        }, 5000)
      );
    };

    // Small initial delay so it doesn't fight the hero load-in.
    pending.push(setTimeout(showOne, 4000));

    return () => {
      cancelled = true;
      pending.forEach(clearTimeout);
      timers.current = [];
    };
  }, [enabled]);

  if (!enabled || !toast) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 pointer-events-none hidden sm:block"
    >
      <div
        key={toast.key}
        className={`max-w-[300px] rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur-sm transition-all duration-500 ${
          visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="mt-1 flex-shrink-0">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
            </span>
          </span>
          <div className="leading-snug">
            <p className="text-[13px] text-foreground font-body">
              <span className="font-bold">{toast.name}</span> {toast.action}
            </p>
            <p className="text-[11px] text-muted-foreground font-body mt-0.5">
              {timeAgo(toast.minutesAgo)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

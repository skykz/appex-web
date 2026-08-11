import { useEffect, useRef } from "react";
import { ga4ScrollDepth } from "@/lib/ga4";
import { ymScrollDepth } from "@/lib/yandex-metrica";
import { pushToDataLayer } from "@/lib/gtm";

/** Thresholds reported, in percent of scrollable page height. */
const THRESHOLDS = [25, 50, 75, 100] as const;

/**
 * Reports how far down the page the visitor scrolled, as `scroll_depth` events.
 *
 * Each threshold fires at most once per mount, so a visitor scrolling up and back
 * down doesn't inflate the counts — the question being answered is "how far did
 * this person get", not "how much did they scroll".
 *
 * Listens passively and reads layout inside a rAF, so the handler can't make
 * scrolling janky on mobile (where most of this traffic lands).
 */
export function useScrollDepth(): void {
  const fired = useRef<Set<number>>(new Set());

  useEffect(() => {
    let queued = false;

    const measure = () => {
      queued = false;
      const doc = document.documentElement;
      // Total distance the visitor can actually travel. Guard against 0 on short
      // pages, where every scroll position would otherwise read as 100%.
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;

      const percent = ((window.scrollY || doc.scrollTop) / scrollable) * 100;

      for (const t of THRESHOLDS) {
        if (percent + 0.5 >= t && !fired.current.has(t)) {
          fired.current.add(t);
          ga4ScrollDepth({ percent: t });
          ymScrollDepth({ percent: t });
          pushToDataLayer("scroll_depth", { percent: t });
        }
      }
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(measure);
    };

    // Measure once on mount: a visitor arriving at an anchor (or restoring a
    // scroll position) may already be past the first thresholds.
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
}

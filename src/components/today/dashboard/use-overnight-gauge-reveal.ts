'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * Arms the overnight gauge fill after the loading shell remounts with a score.
 *
 * Why not null→value on props? Shell unmounts; the real card mounts with score
 * already set. Why CSS stagger over rAF? Fill runs while the page is still
 * busy (queries, paint) — CSS transitions stay smooth off the main thread.
 *
 * Strict Mode safe: no “already revealed” flag set before the paint; cleanup
 * only cancels timers, so the second effect run can arm again.
 */
export function useOvernightGaugeReveal(
  score: number | null,
  delayMs = 0,
): {
  fill: boolean;
  displayScore: number | null;
} {
  const reduce = useReducedMotion() ?? false;
  const [fill, setFill] = useState(false);

  useEffect(() => {
    if (score === null) {
      setFill(false);
      return;
    }

    if (reduce) {
      setFill(true);
      return;
    }

    // Start empty so the first paint is the track — then arm the cascade.
    setFill(false);
    let alive = true;
    let rafOuter = 0;
    let rafInner = 0;

    const timer = window.setTimeout(() => {
      rafOuter = requestAnimationFrame(() => {
        rafInner = requestAnimationFrame(() => {
          if (alive) {
            setFill(true);
          }
        });
      });
    }, delayMs);

    return () => {
      alive = false;
      window.clearTimeout(timer);
      cancelAnimationFrame(rafOuter);
      cancelAnimationFrame(rafInner);
    };
  }, [score, reduce, delayMs]);

  // Reduced motion / filled: show the real score. Empty track: em dash via null.
  const displayScore = score === null ? null : fill || reduce ? score : null;

  return { fill: fill || (reduce && score !== null), displayScore };
}

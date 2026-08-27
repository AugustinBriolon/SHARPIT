import { motionTokens } from '@/lib/motion/tokens';

/**
 * Runtime motion gates — motion-foundations.
 * Never read window/navigator at module level.
 */
export const motionConfig = {
  isLowEnd(): boolean {
    if (typeof navigator === 'undefined') return false;
    const nav = navigator as Navigator & { deviceMemory?: number };
    if (nav.deviceMemory !== undefined && nav.deviceMemory <= 2) return true;
    if (nav.deviceMemory === undefined && navigator.hardwareConcurrency <= 4) return true;
    return false;
  },

  prefersReduced(): boolean {
    return (
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  },

  shouldAnimate({ essential = false }: { essential?: boolean } = {}): boolean {
    if (this.prefersReduced()) return false;
    if (!essential && this.isLowEnd()) return false;
    return true;
  },

  durationSeconds(): number {
    if (this.prefersReduced() || this.isLowEnd()) return motionTokens.duration.instant;
    return motionTokens.duration.normal;
  },
};

/**
 * Reveal animations (a route tracing in, a chart drawing on) are a distinct
 * category from interface chrome — ADR-024 exempts them from `motionTokens`'
 * 300ms cap. Nothing here governs hover, press, expand, or any transition
 * `motionTokens.duration` already covers; that cap is untouched.
 *
 * Duration scales with route length via `revealDurationMs` (3s–5s).
 */
export {
  REVEAL_DURATION_MAX_MS,
  REVEAL_DURATION_MIN_MS,
  revealDurationMs,
} from '@/lib/motion/route-reveal';

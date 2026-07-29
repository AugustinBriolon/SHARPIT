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

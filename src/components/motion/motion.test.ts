import { describe, expect, it } from 'vitest';
import { fadeTransition, fadeVariants, routeFadeTransition } from '@/lib/motion/variants';
import { motionTokens } from '@/lib/motion/tokens';

describe('motion primitives contracts', () => {
  it('fade variants are opacity-only (route-safe)', () => {
    expect(fadeVariants.hidden).toEqual({ opacity: 0 });
    expect(fadeVariants.visible).toEqual({ opacity: 1 });
    expect(fadeVariants.exit).toEqual({ opacity: 0 });
  });

  it('route fade stays within 300ms cap', () => {
    expect(routeFadeTransition.duration).toBeLessThanOrEqual(0.3);
    expect(routeFadeTransition.duration).toBe(motionTokens.duration.slow);
  });

  it('content fade uses fast token', () => {
    expect(fadeTransition.duration).toBe(motionTokens.duration.fast);
  });
});

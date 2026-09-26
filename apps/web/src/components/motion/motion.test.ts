import { describe, expect, it } from 'vitest';
import { fadeTransition, fadeVariants } from '@/client/motion/variants';
import { motionTokens } from '@/client/motion/tokens';

describe('motion primitives contracts', () => {
  it('fade variants are opacity-only', () => {
    expect(fadeVariants.hidden).toEqual({ opacity: 0 });
    expect(fadeVariants.visible).toEqual({ opacity: 1 });
    expect(fadeVariants.exit).toEqual({ opacity: 0 });
  });

  it('content fade uses fast token', () => {
    expect(fadeTransition.duration).toBe(motionTokens.duration.fast);
  });
});

import { describe, expect, it } from 'vitest';
import { motionTokens } from '@/lib/motion/tokens';

describe('motionTokens (DESIGN_LANGUAGE §9)', () => {
  it('caps all durations at 300ms', () => {
    expect(motionTokens.duration.instant).toBeLessThanOrEqual(0.3);
    expect(motionTokens.duration.fast).toBeLessThanOrEqual(0.3);
    expect(motionTokens.duration.normal).toBeLessThanOrEqual(0.3);
    expect(motionTokens.duration.slow).toBeLessThanOrEqual(0.3);
  });

  it('uses SHARPIT press scale 0.96', () => {
    expect(motionTokens.scale.press).toBe(0.96);
  });

  it('keeps stagger children between 50–100ms', () => {
    expect(motionTokens.stagger.children).toBeGreaterThanOrEqual(0.05);
    expect(motionTokens.stagger.children).toBeLessThanOrEqual(0.1);
  });
});

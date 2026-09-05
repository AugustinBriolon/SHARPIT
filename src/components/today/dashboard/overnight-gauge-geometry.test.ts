import { describe, expect, it } from 'vitest';
import {
  OVERNIGHT_GAUGE_REVEAL_MS,
  OVERNIGHT_TICKS,
  overnightRevealDelayMs,
  overnightTickStroke,
} from './overnight-gauge-geometry';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('overnight gauge geometry', () => {
  it('precomputes a stable tick track', () => {
    expect(OVERNIGHT_TICKS).toHaveLength(52);
    expect(OVERNIGHT_TICKS[0]?.x1).toBeTypeOf('number');
    expect(OVERNIGHT_GAUGE_REVEAL_MS).toBeGreaterThanOrEqual(400);
  });

  it('keeps unknown scores on the border track', () => {
    expect(overnightTickStroke(0, null)).toBe('var(--color-border)');
    expect(overnightTickStroke(0, 50)).toBe('var(--color-foreground)');
  });

  it('eases reveal delays toward the tip', () => {
    expect(overnightRevealDelayMs(0)).toBe(0);
    expect(overnightRevealDelayMs(OVERNIGHT_TICKS.length - 1)).toBe(OVERNIGHT_GAUGE_REVEAL_MS);
    expect(overnightRevealDelayMs(1)).toBeLessThan(overnightRevealDelayMs(40));
  });
});

describe('useOvernightGaugeReveal', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/components/today/dashboard/use-overnight-gauge-reveal.ts'),
    'utf8',
  );

  it('arms fill after empty paint and stays Strict Mode safe', () => {
    expect(source).toContain('setFill(false)');
    expect(source).toContain('requestAnimationFrame');
    expect(source).toContain('useReducedMotion');
    expect(source).not.toContain('revealedRef');
  });
});

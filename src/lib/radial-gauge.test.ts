import { describe, expect, it } from 'vitest';
import {
  formatRadialValue,
  RADIAL_EMPTY_COLOR,
  radialFillPercent,
  resolveRadialStrokeColor,
  scoreStrokeColor,
} from '@/lib/radial-gauge';

describe('scoreStrokeColor', () => {
  it('null → empty token', () => expect(scoreStrokeColor(null)).toBe(RADIAL_EMPTY_COLOR));
  it('85 → base signal', () => expect(scoreStrokeColor(85)).toBe('var(--signal-base)'));
  it('50 → caution signal', () => expect(scoreStrokeColor(50)).toBe('var(--signal-caution)'));
  it('20 → risk signal', () => expect(scoreStrokeColor(20)).toBe('var(--signal-risk)'));
});

describe('resolveRadialStrokeColor', () => {
  it('neutral → fixed neutral token', () => {
    expect(resolveRadialStrokeColor(42, 'neutral')).toBe('var(--signal-neutral)');
  });
  it('strain → fixed threshold token', () => {
    expect(resolveRadialStrokeColor(42, 'strain')).toBe('var(--signal-threshold)');
  });
  it('dynamic → score-based', () => {
    expect(resolveRadialStrokeColor(85, 'dynamic')).toBe('var(--signal-base)');
  });
});

describe('radialFillPercent', () => {
  it('null → 0', () => expect(radialFillPercent(null, 100)).toBe(0));
  it('clamps to 100', () => expect(radialFillPercent(150, 100)).toBe(100));
  it('strain scale', () => expect(radialFillPercent(10.5, 21)).toBeCloseTo(50));
});

describe('formatRadialValue', () => {
  it('percent → rounded integer string', () =>
    expect(formatRadialValue(72.4, 'number')).toBe('72'));
  it('strain → one decimal', () => expect(formatRadialValue(10.456, 'strain')).toBe('10.5'));
});

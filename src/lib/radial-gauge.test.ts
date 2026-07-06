import { describe, expect, it } from 'vitest';
import {
  formatRadialValue,
  radialFillPercent,
  resolveRadialStrokeColor,
  scoreStrokeColor,
} from '@/lib/radial-gauge';

describe('scoreStrokeColor', () => {
  it('null → empty gray', () => expect(scoreStrokeColor(null)).toBe('#CBD5E1'));
  it('85 → emerald', () => expect(scoreStrokeColor(85)).toBe('#059669'));
  it('50 → amber', () => expect(scoreStrokeColor(50)).toBe('#D97706'));
  it('20 → red', () => expect(scoreStrokeColor(20)).toBe('#DC2626'));
});

describe('resolveRadialStrokeColor', () => {
  it('neutral → fixed gray-blue', () => {
    expect(resolveRadialStrokeColor(42, 'neutral')).toBe('#809cb6');
  });
  it('strain → fixed blue', () => {
    expect(resolveRadialStrokeColor(42, 'strain')).toBe('#3B82F6');
  });
  it('dynamic → score-based', () => {
    expect(resolveRadialStrokeColor(85, 'dynamic')).toBe('#059669');
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

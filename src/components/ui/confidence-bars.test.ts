import { describe, expect, it } from 'vitest';
import { confidenceBarsFromPct } from '@/components/ui/confidence-bars';

describe('confidenceBarsFromPct', () => {
  it('maps pct tiers to 0–3 bars', () => {
    expect(confidenceBarsFromPct(null)).toBe(0);
    expect(confidenceBarsFromPct(undefined)).toBe(0);
    expect(confidenceBarsFromPct(0)).toBe(0);
    expect(confidenceBarsFromPct(10)).toBe(1);
    expect(confidenceBarsFromPct(33)).toBe(1);
    expect(confidenceBarsFromPct(34)).toBe(2);
    expect(confidenceBarsFromPct(66)).toBe(2);
    expect(confidenceBarsFromPct(67)).toBe(3);
    expect(confidenceBarsFromPct(100)).toBe(3);
  });
});

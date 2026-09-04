import { describe, expect, it } from 'vitest';
import { mapSorenessUiToDomain, WELLNESS_UI_SCALE } from '@/lib/health/morning-wellness-scale';

describe('morning wellness UI scale', () => {
  it('exposes a continuous 1–5 range', () => {
    expect([...WELLNESS_UI_SCALE]).toEqual([1, 2, 3, 4, 5]);
  });

  it('maps soreness UI scores linearly onto the domain 0–10 scale', () => {
    expect(mapSorenessUiToDomain(1)).toBe(0);
    expect(mapSorenessUiToDomain(2)).toBe(3);
    expect(mapSorenessUiToDomain(3)).toBe(5);
    expect(mapSorenessUiToDomain(4)).toBe(8);
    expect(mapSorenessUiToDomain(5)).toBe(10);
  });
});

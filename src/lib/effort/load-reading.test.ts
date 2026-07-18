import { describe, expect, it } from 'vitest';
import {
  classifyAcwrZone,
  explainTsb,
  synthesizeLoadReading,
  tssGapToSweetSpotFloor,
} from '@/lib/effort/load-reading';

describe('classifyAcwrZone', () => {
  it('maps under / optimal / alert / danger', () => {
    expect(classifyAcwrZone(0.54)).toBe('under');
    expect(classifyAcwrZone(1.1)).toBe('optimal');
    expect(classifyAcwrZone(1.4)).toBe('alert');
    expect(classifyAcwrZone(1.8)).toBe('danger');
  });
});

describe('tssGapToSweetSpotFloor', () => {
  it('computes TSS still needed to reach ACWR 0.9', () => {
    // base 341 → floor 307; week 184 → gap 123
    expect(tssGapToSweetSpotFloor(184, 341)).toBe(123);
  });

  it('returns 0 when already above the floor', () => {
    expect(tssGapToSweetSpotFloor(320, 341)).toBe(0);
  });
});

describe('synthesizeLoadReading', () => {
  it('explains maintain + underload + negative TSB with numbers', () => {
    const line = synthesizeLoadReading({
      verdictKey: 'MAINTAIN',
      acwr: 0.54,
      weeklyLoad: 184,
      chronicWeeklyAvg: 341,
      tsb: -13,
      trainingCapacity: 'FULL',
    });
    expect(line).toContain('0.54');
    expect(line).toContain('-13');
    expect(line.toLowerCase()).toMatch(/sous-charge|mainten/);
  });
});

describe('explainTsb', () => {
  it('explains a mildly negative TSB', () => {
    expect(explainTsb(-13)).toContain('-13');
  });
});

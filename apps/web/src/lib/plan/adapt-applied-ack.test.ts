import { describe, expect, it } from 'vitest';
import {
  adaptAppliedHeadline,
  adaptAppliedWhy,
  buildAdaptAppliedAck,
  localDayKey,
  shouldSuppressRearrangeAfterApply,
} from '@/lib/plan/adapt-applied-ack';

describe('adapt-applied-ack', () => {
  const noon = new Date(2026, 8, 12, 14, 0, 0);

  it('builds day-keyed ack with goal label', () => {
    const ack = buildAdaptAppliedAck({
      goalLabel: 'Semi Paris',
      changeCount: 2,
      now: noon,
    });
    expect(ack.dayKey).toBe('2026-09-12');
    expect(ack.goalLabel).toBe('Semi Paris');
    expect(ack.changeCount).toBe(2);
    expect(localDayKey(noon)).toBe(ack.dayKey);
  });

  it('suppresses rearrange the same local day only', () => {
    const ack = buildAdaptAppliedAck({
      goalLabel: '10K',
      changeCount: 1,
      now: noon,
    });
    expect(shouldSuppressRearrangeAfterApply(ack, noon)).toBe(true);
    expect(shouldSuppressRearrangeAfterApply(ack, new Date(2026, 8, 12, 23, 50))).toBe(true);
    expect(shouldSuppressRearrangeAfterApply(ack, new Date(2026, 8, 13, 6, 0))).toBe(false);
    expect(shouldSuppressRearrangeAfterApply(null, noon)).toBe(false);
  });

  it('copy anchors goal and change count', () => {
    expect(adaptAppliedHeadline('Semi Paris')).toBe('Plan ajusté vers Semi Paris');
    expect(adaptAppliedHeadline(null)).toBe('Plan ajusté');
    expect(adaptAppliedWhy(2)).toMatch(/2 séances/);
    expect(adaptAppliedWhy(1)).toMatch(/1 séance/);
  });
});

import { describe, expect, it } from 'vitest';
import {
  demoAnchorTrainingDayId,
  demoDateFromTrainingDayId,
  demoTrainingDayIdDaysAgo,
  isDemoHealthDateCurrent,
} from '@/lib/demo/demo-calendar';
import { dayKeyFromDate } from '@/lib/date/day-key';
import { computeTrainingDayId } from '@/lib/training/training-day';

describe('demoCalendar', () => {
  it('anchors today on the Paris training day, not server-local startOfDay', () => {
    const now = new Date('2026-09-11T08:00:00.000Z'); // 10:00 Paris (CEST)
    expect(demoAnchorTrainingDayId(now)).toBe(computeTrainingDayId(now));
    expect(demoAnchorTrainingDayId(now)).toBe('2026-09-11');
  });

  it('stores @db.Date as UTC midnight of the training-day calendar', () => {
    const date = demoDateFromTrainingDayId('2026-09-11');
    expect(dayKeyFromDate(date)).toBe('2026-09-11');
    expect(date.toISOString()).toBe('2026-09-11T00:00:00.000Z');
  });

  it('walks training days without local timezone drift', () => {
    const now = new Date('2026-09-11T08:00:00.000Z');
    expect(demoTrainingDayIdDaysAgo(0, now)).toBe('2026-09-11');
    expect(demoTrainingDayIdDaysAgo(1, now)).toBe('2026-09-10');
    expect(isDemoHealthDateCurrent(demoDateFromTrainingDayId('2026-09-11'), now)).toBe(true);
    expect(isDemoHealthDateCurrent(demoDateFromTrainingDayId('2026-09-10'), now)).toBe(false);
  });
});

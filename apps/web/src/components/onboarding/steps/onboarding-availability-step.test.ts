import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sessionsFromWeekdays } from '@sharpit/server/lib/training-availability/types';

describe('OnboardingAvailabilityStep', () => {
  const source = readFileSync(
    new URL('./onboarding-availability-step.tsx', import.meta.url),
    'utf8',
  );

  it('does not expose a separate session-count picker', () => {
    expect(source).not.toMatch(/SessionCountPicker/);
    expect(source).not.toMatch(/Séances par semaine/);
    expect(source).not.toMatch(/SESSION_CHOICES/);
  });

  it('keeps weekday selection and derives sessions from days', () => {
    expect(source).toMatch(/Jours disponibles/);
    expect(source).toMatch(/sessionsFromWeekdays/);
    expect(source).toMatch(/WeekdayPicker/);
  });

  it('avoids em dashes in athlete-facing copy', () => {
    expect(source).not.toMatch(/[—–]/);
  });
});

describe('sessionsFromWeekdays', () => {
  it('maps N days to N sessions and empty to null', () => {
    expect(sessionsFromWeekdays([])).toBeNull();
    expect(sessionsFromWeekdays([1])).toBe(1);
    expect(sessionsFromWeekdays([1, 3, 5])).toBe(3);
  });
});

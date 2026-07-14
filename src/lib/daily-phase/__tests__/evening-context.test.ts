import { describe, expect, it } from 'vitest';
import {
  buildEndOfDayNarrativeCopy,
  pickTomorrowSessionHint,
} from '@/lib/daily-phase/evening-context';

const baseSleep = {
  recommendedBedtimeMin: 22 * 60 + 30,
  recommendedDurationMin: 480,
  debt7Min: null,
  hasSleepHistory: true,
  bedtimeTargetMin: 22 * 60 + 30,
};

describe('buildEndOfDayNarrativeCopy', () => {
  it('headline bilan today and focus on tonight recovery', () => {
    const copy = buildEndOfDayNarrativeCopy({
      sportLabel: 'Course',
      totalTssToday: 28,
      totalDurationMin: 14,
      effortLevel: 'light',
      completedSessionCount: 1,
      tomorrowSession: null,
      sleep: baseSleep,
      recoveryStress: true,
    });

    expect(copy.headline).toBe('Course légère — récupère bien, le corps en demande');
    expect(copy.focusPriority).toMatch(/Coucher vers 22:00/);
    expect(copy.focusPriority).toMatch(/récupérer de la journée/);
    expect(copy.focusPriority).not.toMatch(/Demain :/);
  });

  it('adapts bedtime when session tomorrow morning', () => {
    const copy = buildEndOfDayNarrativeCopy({
      sportLabel: 'Course',
      totalTssToday: 50,
      totalDurationMin: 45,
      effortLevel: 'moderate',
      completedSessionCount: 1,
      tomorrowSession: {
        sportLabel: 'Course',
        startTime: '07:00',
        startHour: 7,
      },
      sleep: baseSleep,
      recoveryStress: false,
    });

    expect(copy.focusPriority).toMatch(/Coucher vers/);
    expect(copy.focusPriority).toMatch(/séance demain à 07:00/);
  });
});

describe('pickTomorrowSessionHint', () => {
  it('returns next day planned session', () => {
    const ref = new Date('2026-07-08T22:00:00');
    const hint = pickTomorrowSessionHint(ref, [
      {
        date: new Date('2026-07-09'),
        type: 'RUN',
        startTime: '07:30',
        completed: false,
      },
    ]);

    expect(hint?.sportLabel).toBe('Course');
    expect(hint?.startTime).toBe('07:30');
  });
});

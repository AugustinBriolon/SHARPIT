import { describe, expect, it } from 'vitest';
import { buildPlanLivingCallout } from '@/lib/plan/hub/plan-living-callout';

const remainingHard = [
  {
    id: 's1',
    date: '2026-08-27T09:00:00',
    intensity: 'THRESHOLD' as const,
    completed: false,
  },
];

const remainingEasy = [
  {
    id: 's1',
    date: '2026-08-27T09:00:00',
    intensity: 'ENDURANCE' as const,
    completed: false,
  },
];

describe('buildPlanLivingCallout', () => {
  it('stays quiet when accent is not ajuster', () => {
    expect(
      buildPlanLivingCallout({
        hasDatedGoal: true,
        hasActiveMacro: false,
        hasRemainingSessions: true,
        goalLabel: 'Semi',
        verdict: 'CAUTION',
        remaining: remainingHard,
      }),
    ).toBeNull();
  });

  it('surfaces protect callout when ajuster + caution + hard remaining', () => {
    const callout = buildPlanLivingCallout({
      hasDatedGoal: true,
      hasActiveMacro: true,
      hasRemainingSessions: true,
      goalLabel: 'Semi Paris',
      verdict: 'CAUTION',
      remaining: remainingHard,
    });
    expect(callout).toMatchObject({
      visible: true,
      kind: 'protect',
      accent: 'ajuster',
      goalLabel: 'Semi Paris',
      ctaLabel: 'Ajuster le planning',
    });
    expect(callout?.previewSessions[0]?.tone).toBe('tension');
  });

  it('surfaces push callout when capacity + only easy', () => {
    const callout = buildPlanLivingCallout({
      hasDatedGoal: true,
      hasActiveMacro: true,
      hasRemainingSessions: true,
      goalLabel: '10K',
      verdict: 'TRAIN_HARD',
      remaining: remainingEasy,
    });
    expect(callout?.kind).toBe('push');
  });
});

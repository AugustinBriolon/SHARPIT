import { describe, expect, it } from 'vitest';
import type { TodayJournalHabitCallout } from '@/lib/journal/journal-habit-today-bridge';
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

const habitAssociation: TodayJournalHabitCallout = {
  kind: 'association',
  bridge: {
    sourceLabel: 'Depuis ton journal',
    habitLabel: 'Repas tardif',
    meaning: 'Quand tu notes « Repas tardif », sommeil et récupération sont souvent plus bas.',
    disclaimer: 'Contraste dans tes saisies — pas une preuve de cause.',
    confidenceNote: 'Association nette',
    ctaLabel: 'Voir l’analyse',
    polarity: 'minus',
    confidence: 'high',
    factorId: 'late_meal',
    href: '/journal/analyses',
  },
};

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
    expect(callout?.focus).toMatch(/prudence/i);
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
    expect(callout?.focus).toMatch(/pousser/i);
  });

  it('falls back to habit when Twin is quiet and journal lever is gated', () => {
    const callout = buildPlanLivingCallout({
      hasDatedGoal: true,
      hasActiveMacro: true,
      hasRemainingSessions: true,
      goalLabel: 'Semi Paris',
      verdict: 'TRAIN_SMART',
      remaining: remainingHard,
      habitCallout: habitAssociation,
      day: new Date(2026, 7, 26),
    });
    expect(callout).toMatchObject({
      kind: 'habit',
      accent: 'ajuster',
      ctaLabel: 'Ajuster le planning',
      goalLabel: 'Semi Paris',
    });
    expect(callout?.why).toMatch(/vers Semi Paris/);
    expect(callout?.focus).toMatch(/^Journal\s*:/);
  });

  it('keeps Twin protect over habit when both fire', () => {
    const callout = buildPlanLivingCallout({
      hasDatedGoal: true,
      hasActiveMacro: true,
      hasRemainingSessions: true,
      goalLabel: 'Semi Paris',
      verdict: 'CAUTION',
      remaining: remainingHard,
      habitCallout: habitAssociation,
      day: new Date(2026, 7, 26),
    });
    expect(callout?.kind).toBe('protect');
  });
});

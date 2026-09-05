import { ActivityType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { buildWeekDecision } from '@/lib/plan/plan-week-decision';
import type { PlanWeek } from '@/lib/plan/plan-week';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';

function week(
  partial: Partial<PlanWeek> & Pick<PlanWeek, 'isEmpty' | 'remaining' | 'done'>,
): PlanWeek {
  return {
    start: new Date(2026, 7, 31),
    days: [],
    doneLoad: 0,
    doneLoadKnown: false,
    plannedLoad: 0,
    ...partial,
  };
}

function remaining(id: string, intensity: string, date: Date, title: string): ThreadEntry {
  return {
    id,
    dayKey: '2026-09-04',
    type: ActivityType.STRENGTH,
    title,
    kind: 'planned',
    activity: null,
    planned: {
      id,
      date,
      intensity,
    } as ThreadEntry['planned'],
  };
}

describe('buildWeekDecision', () => {
  it('sends an empty week to build the calendar', () => {
    expect(
      buildWeekDecision({
        week: week({ isEmpty: true, remaining: [], done: [] }),
        verdict: null,
        cautionLabel: null,
        hasBrief: false,
      }),
    ).toEqual({
      kind: 'empty',
      sentence: 'Sans séance prévue ni réalisée, il n’y a rien à comparer.',
      reason: null,
      primary: { label: 'Construire la semaine', href: '/plan/semaine', sessionId: null },
      secondary: null,
    });
  });

  it('protects the next gated hard session', () => {
    const friday = remaining('s1', 'THRESHOLD', new Date(2026, 8, 4), 'Force salle');
    const decision = buildWeekDecision({
      week: week({ isEmpty: false, remaining: [friday], done: [{} as ThreadEntry] }),
      verdict: 'RECOVER',
      cautionLabel: 'Sommeil',
      hasBrief: false,
    });
    expect(decision.kind).toBe('gated');
    expect(decision.sentence).toBe('Tiens le volume, protège vendredi.');
    expect(decision.reason).toBe('Sommeil');
    expect(decision.primary).toEqual({
      label: 'Adapter vendredi',
      href: '/plan/semaine',
      sessionId: 's1',
    });
    expect(decision.secondary).toEqual({
      label: 'La semaine',
      href: '/plan/semaine',
      sessionId: null,
    });
  });

  it('names the next remaining session while the week is open', () => {
    const next = remaining('s2', 'ENDURANCE', new Date(2026, 8, 5), 'Vélo endurance');
    const decision = buildWeekDecision({
      week: week({ isEmpty: false, remaining: [next], done: [{} as ThreadEntry] }),
      verdict: 'TRAIN_SMART',
      cautionLabel: null,
      hasBrief: false,
    });
    expect(decision.kind).toBe('in_progress');
    expect(decision.sentence).toBe('Tiens le volume. Prochaine : Vélo endurance.');
    expect(decision.primary.sessionId).toBe('s2');
    expect(decision.secondary?.label).toBe('La semaine');
  });

  it('routes a finished week to the brief when one exists', () => {
    const decision = buildWeekDecision({
      week: week({ isEmpty: false, remaining: [], done: [{} as ThreadEntry] }),
      verdict: null,
      cautionLabel: null,
      hasBrief: true,
    });
    expect(decision).toMatchObject({
      kind: 'complete',
      sentence: 'La semaine est tenue. Lis ce qu’elle a produit.',
      primary: { label: 'Voir le bilan', href: '/plan/bilan', sessionId: null },
      secondary: { label: 'La semaine', href: '/plan/semaine', sessionId: null },
    });
  });

  it('keeps a finished week on the calendar when there is no brief', () => {
    const decision = buildWeekDecision({
      week: week({ isEmpty: false, remaining: [], done: [{} as ThreadEntry] }),
      verdict: null,
      cautionLabel: null,
      hasBrief: false,
    });
    expect(decision.primary).toEqual({
      label: 'La semaine',
      href: '/plan/semaine',
      sessionId: null,
    });
    expect(decision.secondary).toBeNull();
  });
});

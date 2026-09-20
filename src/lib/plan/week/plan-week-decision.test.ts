import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';
import { buildWeekDecision, upcomingRemaining } from '@/lib/plan/week/plan-week-decision';
import type { PlanWeek } from '@/lib/plan/week/plan-week';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';

const NOW = new Date(2026, 8, 3, 10, 0, 0); // Wednesday 3 Sep 2026

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
    dayKey: formatDayKey(date),
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

function formatDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

describe('upcomingRemaining', () => {
  it('keeps today and later, drops past days', () => {
    const monday = remaining('past', 'ENDURANCE', new Date(2026, 7, 31), 'Lundi');
    const wednesday = remaining('today', 'ENDURANCE', new Date(2026, 8, 3), 'Mercredi');
    const friday = remaining('future', 'ENDURANCE', new Date(2026, 8, 5), 'Vendredi');
    expect(upcomingRemaining([monday, wednesday, friday], NOW).map((e) => e.id)).toEqual([
      'today',
      'future',
    ]);
  });
});

describe('buildWeekDecision', () => {
  it('sends an empty week to the calendar without pretending there is a next session', () => {
    expect(
      buildWeekDecision({
        week: week({ isEmpty: true, remaining: [], done: [] }),
        verdict: null,
        cautionLabel: null,
        hasBrief: false,
        now: NOW,
      }),
    ).toEqual({
      kind: 'empty',
      sentence: 'Rien de prévu cette semaine.',
      reason: null,
      primary: { label: 'Ouvrir le calendrier', href: '/plan/semaine', sessionId: null },
      secondary: null,
    });
  });

  it('protects the next gated hard session that is still ahead', () => {
    const friday = remaining('s1', 'THRESHOLD', new Date(2026, 8, 4), 'Force salle');
    const decision = buildWeekDecision({
      week: week({ isEmpty: false, remaining: [friday], done: [{} as ThreadEntry] }),
      verdict: 'RECOVER',
      cautionLabel: 'Sommeil',
      hasBrief: false,
      now: NOW,
    });
    expect(decision.kind).toBe('gated');
    expect(decision.sentence).toBe('Prochaine séance');
    expect(decision.reason).toBe('Sommeil');
    expect(decision.primary).toEqual({
      label: 'Adapter vendredi',
      href: '/plan/semaine',
      sessionId: 's1',
    });
    expect(decision.secondary).toEqual({
      label: 'Planning',
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
      now: NOW,
    });
    expect(decision.kind).toBe('in_progress');
    expect(decision.sentence).toBe('Prochaine séance');
    expect(decision.primary.sessionId).toBe('s2');
    expect(decision.secondary?.label).toBe('Planning');
  });

  it('skips past remaining when naming the next session', () => {
    const monday = remaining('missed', 'ENDURANCE', new Date(2026, 7, 31), 'Lundi manqué');
    const friday = remaining('next', 'ENDURANCE', new Date(2026, 8, 5), 'Vendredi');
    const decision = buildWeekDecision({
      week: week({ isEmpty: false, remaining: [monday, friday], done: [] }),
      verdict: null,
      cautionLabel: null,
      hasBrief: false,
      now: NOW,
    });
    expect(decision.kind).toBe('in_progress');
    expect(decision.sentence).toBe('Prochaine séance');
    expect(decision.primary.sessionId).toBe('next');
  });

  it('does not call a past-only remaining week « Prochaine séance »', () => {
    const monday = remaining('missed', 'ENDURANCE', new Date(2026, 7, 31), 'Lundi manqué');
    const decision = buildWeekDecision({
      week: week({ isEmpty: false, remaining: [monday], done: [{} as ThreadEntry] }),
      verdict: null,
      cautionLabel: null,
      hasBrief: false,
      now: NOW,
    });
    expect(decision.kind).toBe('missed');
    expect(decision.sentence).toBe('Des séances prévues n’ont pas été tenues.');
    expect(decision.primary.sessionId).toBeNull();
  });

  it('routes a finished week to the brief when one exists', () => {
    const decision = buildWeekDecision({
      week: week({ isEmpty: false, remaining: [], done: [{} as ThreadEntry] }),
      verdict: null,
      cautionLabel: null,
      hasBrief: true,
      now: NOW,
    });
    expect(decision).toMatchObject({
      kind: 'complete',
      sentence: 'La semaine est tenue. Lis ce qu’elle a produit.',
      primary: { label: 'Voir le bilan', href: '/plan/bilan', sessionId: null },
      secondary: { label: 'Planning', href: '/plan/semaine', sessionId: null },
    });
  });

  it('keeps a finished week on the calendar when there is no brief', () => {
    const decision = buildWeekDecision({
      week: week({ isEmpty: false, remaining: [], done: [{} as ThreadEntry] }),
      verdict: null,
      cautionLabel: null,
      hasBrief: false,
      now: NOW,
    });
    expect(decision.primary).toEqual({
      label: 'Planning',
      href: '/plan/semaine',
      sessionId: null,
    });
    expect(decision.secondary).toBeNull();
  });
});

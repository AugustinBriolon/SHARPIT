import { describe, expect, it } from 'vitest';
import type { TodayDaySummary } from '@/lib/today-day-summary';
import {
  buildContextualTodayMessage,
  buildTodayEffortSnapshot,
  classifyTodayEffort,
  mapContextualNarrativeDisplay,
} from './today-narrative-context';

const plannedSummary: TodayDaySummary = {
  sectionLabel: "Prévu aujourd'hui",
  isEmpty: false,
  lines: [
    {
      id: 'p1',
      kind: 'planned',
      primary: 'Tempo 45 min',
      plannedSession: {
        id: 'p1',
        title: 'Tempo 45 min',
        date: new Date(),
        type: 'RUN',
        completed: false,
        activityId: null,
      } as TodayDaySummary['lines'][number]['plannedSession'],
    },
  ],
};

const doneSummary: TodayDaySummary = {
  sectionLabel: "Réalisé aujourd'hui",
  isEmpty: false,
  lines: [
    {
      id: 'a1',
      kind: 'done',
      primary: 'Course · Sortie tempo',
      secondary: '1h05 · 72 TSS',
    },
  ],
};

describe('classifyTodayEffort', () => {
  it('marks high load from TSS', () => {
    expect(classifyTodayEffort(1, 80, 3600)).toBe('high');
  });
});

describe('buildContextualTodayMessage', () => {
  it('returns default rationale when nothing planned (morning)', () => {
    const empty: TodayDaySummary = { sectionLabel: '—', lines: [], isEmpty: true };
    expect(
      buildContextualTodayMessage({
        verdict: 'RECOVER',
        defaultRationale: 'Repos.',
        daySummary: empty,
        now: new Date('2026-07-07T09:00:00'),
      }),
    ).toBe('Repos.');
  });

  it('contextualises recover verdict with planned session', () => {
    const msg = buildContextualTodayMessage({
      verdict: 'RECOVER',
      defaultRationale: 'Tes systèmes ont besoin de repos.',
      daySummary: plannedSummary,
      now: new Date('2026-07-07T10:00:00'),
    });
    expect(msg).toContain('prévu');
    expect(msg).not.toContain('Tempo');
  });

  it('advises evening recovery after completed session', () => {
    const effort = {
      sessionCount: 1,
      totalTss: 9,
      totalDurationSec: 1800,
      level: 'light' as const,
      sportLabel: 'Vélo',
    };
    const msg = buildContextualTodayMessage({
      verdict: 'CAUTION',
      defaultRationale: 'Des signaux contradictoires appellent à la modération.',
      daySummary: doneSummary,
      effort,
      now: new Date('2026-07-07T21:00:00'),
    });
    expect(msg).toBe("Vélo fait — repos ce soir, rien d'autre.");
  });
});

describe('mapContextualNarrativeDisplay', () => {
  it('shows intense day label after hard evening session', () => {
    const display = mapContextualNarrativeDisplay('CAUTION', {
      daySummary: doneSummary,
      effort: buildTodayEffortSnapshot(
        [
          {
            id: 'a1',
            date: new Date('2026-07-07T18:00:00'),
            type: 'BIKE',
            title: 'Zwift - Going Coastal',
            duration: 3900,
            load: 85,
          } as never,
        ],
        new Date('2026-07-07T21:00:00'),
      ),
      now: new Date('2026-07-07T21:00:00'),
    });
    expect(display.label).toBe('Journée intense');
  });
});

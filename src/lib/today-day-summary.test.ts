import { describe, expect, it } from 'vitest';
import { buildTodayDaySummary } from './today-day-summary';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';

const TODAY = new Date('2026-07-03T10:00:00');

function activity(partial: Partial<ClientActivity> & { id: string }): ClientActivity {
  return {
    type: 'RUN',
    date: TODAY,
    title: null,
    duration: 2700,
    load: 45,
    ...partial,
  } as ClientActivity;
}

function planned(partial: Partial<ClientPlannedSession> & { id: string }): ClientPlannedSession {
  return {
    type: 'BIKE',
    date: TODAY,
    title: 'Endurance',
    durationMin: 90,
    intensity: 'ENDURANCE',
    load: 60,
    completed: false,
    activityId: null,
    ...partial,
  } as ClientPlannedSession;
}

describe('buildTodayDaySummary', () => {
  it('shows both completed activities and remaining planned sessions', () => {
    const summary = buildTodayDaySummary(
      TODAY,
      [activity({ id: 'a1', title: 'Footing' })],
      [planned({ id: 'p1', title: 'Endurance vélo' })],
    );

    expect(summary.isEmpty).toBe(false);
    expect(summary.sectionLabel).toBe("Aujourd'hui · réalisé et à venir");
    expect(summary.lines).toHaveLength(2);
    expect(summary.lines[0].kind).toBe('done');
    expect(summary.lines[0].primary).toContain('Footing');
    expect(summary.lines[1].kind).toBe('planned');
    expect(summary.lines[1].primary).toContain('Endurance vélo');
  });

  it('shows planned sessions when nothing was done today', () => {
    const summary = buildTodayDaySummary(TODAY, [], [planned({ id: 'p1', title: 'Endurance' })]);

    expect(summary.sectionLabel).toBe("Prévu aujourd'hui");
    expect(summary.lines[0].kind).toBe('planned');
    expect(summary.lines[0].secondary).toContain('Endurance');
    expect(summary.lines[0].plannedSession?.id).toBe('p1');
  });

  it('attaches the first brick leg for planning deep-links', () => {
    const summary = buildTodayDaySummary(
      TODAY,
      [],
      [
        planned({
          id: 'leg-1',
          type: 'BIKE',
          title: 'Vélo',
          brickGroupId: 'brick-1',
          brickOrder: 0,
        }),
        planned({
          id: 'leg-2',
          type: 'RUN',
          title: 'Course',
          brickGroupId: 'brick-1',
          brickOrder: 1,
        }),
      ],
    );

    expect(summary.lines).toHaveLength(1);
    expect(summary.lines[0].primary).toContain('Brick');
    expect(summary.lines[0].plannedSession?.id).toBe('leg-1');
  });

  it('returns empty state when there is no activity or plan', () => {
    const summary = buildTodayDaySummary(TODAY, [], []);
    expect(summary.isEmpty).toBe(true);
    expect(summary.lines).toHaveLength(0);
  });
});

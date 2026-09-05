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

  it('carries the session RPE, the one number the athlete supplies himself', () => {
    const summary = buildTodayDaySummary(TODAY, [activity({ id: 'a1', rpe: 7 })], []);

    expect(summary.lines[0].secondary).toContain('RPE 7');
    expect(summary.lines[0].secondary).toContain('45 TSS');
  });

  it('attaches structured preview metrics on done lines', () => {
    const summary = buildTodayDaySummary(
      TODAY,
      [
        activity({
          id: 'a1',
          duration: 1690,
          runMetrics: { distanceM: 5200 },
        }),
      ],
      [],
    );

    expect(summary.lines[0].metrics).toEqual([
      { label: 'Distance', value: '5.20', unit: 'km' },
      { label: 'Durée', value: '28:10', unit: 'min' },
      { label: 'Allure', value: '5:25', unit: '/km' },
    ]);
  });

  it('attaches structured preview metrics on planned lines', () => {
    const summary = buildTodayDaySummary(
      TODAY,
      [],
      [planned({ id: 'p1', intensity: 'ENDURANCE', durationMin: 50, load: 40 })],
    );
    expect(summary.lines[0].metrics).toEqual([
      { label: 'Intensité', value: 'Endurance', unit: '' },
      { label: 'Durée', value: '50', unit: 'min' },
      { label: 'Charge', value: '40', unit: 'TSS' },
    ]);
  });

  it('omits RPE rather than inventing one when the session was never rated', () => {
    const summary = buildTodayDaySummary(TODAY, [activity({ id: 'a1', rpe: null })], []);

    expect(summary.lines[0].secondary).not.toContain('RPE');
    expect(summary.lines[0].secondary).toContain('45 TSS');
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
    expect(summary.lines[0].brickLegs?.map((l) => l.id)).toEqual(['leg-1', 'leg-2']);
    expect(summary.lines[0].brickLegs?.map((l) => l.type)).toEqual(['BIKE', 'RUN']);
  });

  it('returns empty state when there is no activity or plan', () => {
    const summary = buildTodayDaySummary(TODAY, [], []);
    expect(summary.isEmpty).toBe(true);
    expect(summary.lines).toHaveLength(0);
  });

  it('surfaces the stamped goal in planned meta (option B)', () => {
    const summary = buildTodayDaySummary(
      TODAY,
      [],
      [planned({ id: 'p1', title: 'Tempo', goalId: 'g1' })],
      new Map([['g1', 'Nice 70.3']]),
    );

    expect(summary.lines[0]?.secondary).toContain('Sert Nice 70.3');
  });

  it('excludes past unrealized sessions from today lines', () => {
    const yesterday = new Date(TODAY.getTime() - 86_400_000);
    const summary = buildTodayDaySummary(
      TODAY,
      [],
      [planned({ id: 'p-old', title: 'Vieille séance', date: yesterday })],
    );
    expect(summary.lines).toHaveLength(0);
    expect(summary.isEmpty).toBe(true);
  });

  it('hides planned sessions once linked even if completed flag lags', () => {
    const summary = buildTodayDaySummary(
      TODAY,
      [
        activity({
          id: 'a1',
          title: 'Ride',
          plannedSession: {
            id: 'p1',
            title: 'Endurance vélo',
          } as ClientActivity['plannedSession'],
        }),
      ],
      [planned({ id: 'p1', title: 'Endurance vélo', completed: false, activityId: null })],
    );

    expect(summary.lines).toHaveLength(1);
    expect(summary.lines[0]?.kind).toBe('done');
    expect(summary.lines[0]?.primary).toContain('Endurance vélo');
    expect(summary.sectionLabel).not.toContain('à venir');
  });

  it('never lists a past unrealized session, whatever the lookback', () => {
    const lastWeek = Array.from({ length: 7 }, (_, i) =>
      planned({ id: `p-${i}`, date: new Date(TODAY.getTime() - (i + 1) * 86_400_000) }),
    );
    const summary = buildTodayDaySummary(TODAY, [], lastWeek);

    expect(summary.lines).toHaveLength(0);
    expect(summary.isEmpty).toBe(true);
  });
});

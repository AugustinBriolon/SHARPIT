import { describe, expect, it } from 'vitest';

import {
  buildWeekCells,
  buildWeekSummary,
  weekCellAccent,
  weekCellHref,
  weekCellReading,
  weekSummaryLabel,
  type WeekCell,
  type WeekStripDay,
} from './week-strip';

// Thursday July 23rd — its week runs Mon 20 → Sun 26.
const TODAY = new Date('2026-07-23T12:00:00');

function cell(overrides: Partial<WeekCell> = {}): WeekCell {
  return {
    weekStart: new Date('2026-07-20T00:00:00'),
    isCurrent: true,
    doneCount: 0,
    plannedCount: 0,
    ...overrides,
  };
}

describe('buildWeekCells', () => {
  it('builds the requested number of weeks, oldest first, current last', () => {
    const cells = buildWeekCells([], [], TODAY, 7);
    expect(cells).toHaveLength(7);
    expect(cells[6].isCurrent).toBe(true);
    expect(cells[6].weekStart.getDate()).toBe(20);
    expect(cells[0].weekStart.getDate()).toBe(8); // Mon June 8th, 6 weeks back
    expect(cells.slice(0, 6).every((c) => !c.isCurrent)).toBe(true);
  });

  it('aggregates activities and planned sessions per week', () => {
    const activities = [
      { date: '2026-07-14T10:00:00' }, // previous week
      { date: '2026-07-21T10:00:00' }, // current week
      { date: '2026-07-22T10:00:00' }, // current week
    ];
    const planned = [{ date: '2026-07-25T08:00:00' }]; // current week
    const cells = buildWeekCells(activities, planned, TODAY, 2);

    expect(cells[0]).toMatchObject({ doneCount: 1, plannedCount: 0, isCurrent: false });
    expect(cells[1]).toMatchObject({ doneCount: 2, plannedCount: 1, isCurrent: true });
  });
});

describe('weekCellReading / weekCellAccent', () => {
  it('shows realized count first, in the done color', () => {
    const reading = weekCellReading(cell({ doneCount: 3, plannedCount: 5 }));
    expect(reading).toEqual({ count: 3, kind: 'done' });
    expect(weekCellAccent(reading.kind)).toBe('var(--color-signal-base)');
  });

  it('falls back to planned count in the neutral color', () => {
    const reading = weekCellReading(cell({ plannedCount: 4 }));
    expect(reading).toEqual({ count: 4, kind: 'planned' });
    expect(weekCellAccent(reading.kind)).toBe('var(--color-signal-neutral)');
  });

  it('is empty without any session', () => {
    const reading = weekCellReading(cell());
    expect(reading).toEqual({ count: 0, kind: 'empty' });
    expect(weekCellAccent(reading.kind)).toBeNull();
  });
});

describe('weekCellHref', () => {
  it('opens the planning framed on the week', () => {
    expect(weekCellHref(cell())).toBe('/training/planning?week=2026-07-20');
  });
});

function day(overrides: Partial<WeekStripDay> = {}): WeekStripDay {
  return {
    date: new Date('2026-07-23T00:00:00'),
    activities: [],
    planned: [],
    ...overrides,
  };
}

describe('buildWeekSummary / weekSummaryLabel', () => {
  it('counts sessions and sums load across the week', () => {
    const days = [
      day({
        activities: [{ id: 'a1', load: 80.4 }],
        planned: [{ activityId: 'a1', intensity: null }],
      }),
      day({ planned: [{ activityId: null, intensity: null }] }),
      day({ activities: [{ id: 'a2', load: null }] }),
    ];
    const summary = buildWeekSummary(days);
    expect(summary).toEqual({ doneCount: 2, plannedCount: 2, weekLoad: 80 });
    expect(weekSummaryLabel(summary)).toBe('2/2 séances · 80 TSS');
  });

  it('drops the plan ratio without planned sessions and the TSS without load', () => {
    expect(weekSummaryLabel({ doneCount: 3, plannedCount: 0, weekLoad: 0 })).toBe('3 séances');
    expect(weekSummaryLabel({ doneCount: 0, plannedCount: 1, weekLoad: 0 })).toBe('0/1 séance');
  });

  it('returns null for an empty week', () => {
    expect(weekSummaryLabel({ doneCount: 0, plannedCount: 0, weekLoad: 0 })).toBeNull();
  });
});

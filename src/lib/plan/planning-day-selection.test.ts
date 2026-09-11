import { describe, expect, it } from 'vitest';
import {
  planningDayKey,
  planningDayStripMark,
  resolveSelectedPlanningDayId,
} from '@/lib/plan/planning-day-selection';

function day(iso: string, planned = 0, activities = 0, completedPlanned = 0) {
  const open = Array.from({ length: planned }, (_, i) => ({
    completed: false,
    id: `p-${iso}-${i}`,
  }));
  const done = Array.from({ length: completedPlanned }, (_, i) => ({
    completed: true,
    id: `c-${iso}-${i}`,
  }));
  return {
    date: new Date(`${iso}T00:00:00`),
    planned: [...open, ...done],
    activities: Array.from({ length: activities }, (_, i) => ({ id: `a-${iso}-${i}` })),
  };
}

describe('resolveSelectedPlanningDayId', () => {
  const week = [
    day('2026-08-31'),
    day('2026-09-01', 1),
    day('2026-09-02'),
    day('2026-09-03', 0, 1),
    day('2026-09-04', 1, 1),
    day('2026-09-05'),
    day('2026-09-06'),
  ];

  it('prefers an explicit day still in the week', () => {
    expect(
      resolveSelectedPlanningDayId(week, {
        today: new Date('2026-09-06T08:00:00'),
        preferredDayId: '2026-09-04',
      }),
    ).toBe('2026-09-04');
  });

  it('ignores a preferred day outside the week', () => {
    expect(
      resolveSelectedPlanningDayId(week, {
        today: new Date('2026-09-06T08:00:00'),
        preferredDayId: '2026-09-10',
      }),
    ).toBe('2026-09-06');
  });

  it('selects today when it falls in the week', () => {
    expect(
      resolveSelectedPlanningDayId(week, {
        today: new Date('2026-09-02T12:00:00'),
      }),
    ).toBe('2026-09-02');
  });

  it('falls back to the first day with content when today is outside the week', () => {
    expect(
      resolveSelectedPlanningDayId(week, {
        today: new Date('2026-09-20T12:00:00'),
      }),
    ).toBe('2026-09-01');
  });

  it('falls back to the week start when the week is empty', () => {
    const empty = week.map((d) => day(planningDayKey(d.date)));
    expect(
      resolveSelectedPlanningDayId(empty, {
        today: new Date('2026-09-20T12:00:00'),
      }),
    ).toBe('2026-08-31');
  });
});

describe('planningDayStripMark', () => {
  it('marks empty days', () => {
    expect(planningDayStripMark(day('2026-09-02'))).toBe('empty');
  });

  it('marks open planned sessions', () => {
    expect(planningDayStripMark(day('2026-09-01', 2))).toBe('planned');
  });

  it('marks done-only days', () => {
    expect(planningDayStripMark(day('2026-09-03', 0, 1))).toBe('done');
    expect(planningDayStripMark(day('2026-09-03', 0, 0, 1))).toBe('done');
  });

  it('marks mixed days', () => {
    expect(planningDayStripMark(day('2026-09-04', 1, 1))).toBe('mixed');
  });
});

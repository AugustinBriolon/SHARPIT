import { describe, expect, it } from 'vitest';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { buildPlanWeek } from './plan-week';

/** Thursday 27 August 2026. Its week runs Monday 24 to Sunday 30. */
const NOW = new Date(2026, 7, 27, 12);
const MONDAY = new Date(2026, 7, 24, 9);
const SATURDAY = new Date(2026, 7, 29, 9);
const LAST_WEEK = new Date(2026, 7, 21, 9);

function activity(partial: Partial<ClientActivity> & { id: string }): ClientActivity {
  return {
    type: 'RUN',
    date: NOW,
    title: null,
    duration: 2700,
    load: 45,
    rpe: null,
    plannedSession: null,
    ...partial,
  } as ClientActivity;
}

function planned(partial: Partial<ClientPlannedSession> & { id: string }): ClientPlannedSession {
  return {
    type: 'BIKE',
    date: NOW,
    title: 'Endurance',
    durationMin: 60,
    intensity: 'ENDURANCE',
    load: 60,
    completed: false,
    activityId: null,
    ...partial,
  } as ClientPlannedSession;
}

function build(input: { activities?: ClientActivity[]; plannedSessions?: ClientPlannedSession[] }) {
  return buildPlanWeek({
    activities: input.activities ?? [],
    plannedSessions: input.plannedSessions ?? [],
    now: NOW,
  });
}

describe('buildPlanWeek', () => {
  it('lays out seven days starting on Monday, whatever day it is', () => {
    const week = build({});

    expect(week.days).toHaveLength(7);
    expect(week.start.getDate()).toBe(24);
    expect(week.days.map((day) => day.date.getDate())).toEqual([24, 25, 26, 27, 28, 29, 30]);
  });

  it('keeps rest days rather than compacting the week to its sessions', () => {
    const week = build({ activities: [activity({ id: 'a1', date: MONDAY })] });

    expect(week.days.map((day) => day.state)).toEqual([
      'done',
      'rest',
      'rest',
      'rest',
      'rest',
      'rest',
      'rest',
    ]);
  });

  it('splits what is recorded from what is still owed', () => {
    const week = build({
      activities: [activity({ id: 'a1', date: MONDAY })],
      plannedSessions: [planned({ id: 'p1', date: SATURDAY })],
    });

    expect(week.done.map((entry) => entry.id)).toEqual(['a1']);
    expect(week.remaining.map((entry) => entry.id)).toEqual(['p1']);
  });

  it('still owes a session prescribed earlier this week and never performed', () => {
    const week = build({ plannedSessions: [planned({ id: 'p1', date: MONDAY })] });

    // Plan is the commitment, not the diary: the week keeps asking for it.
    expect(week.remaining.map((entry) => entry.id)).toEqual(['p1']);
    expect(week.days[0]?.state).toBe('planned');
  });

  it('ignores what belongs to another week', () => {
    const week = build({ activities: [activity({ id: 'old', date: LAST_WEEK })] });

    expect(week.isEmpty).toBe(true);
    expect(week.done).toHaveLength(0);
  });

  it('counts a paired session as done, not as owed', () => {
    const prescription = planned({ id: 'p1', date: MONDAY });
    const week = build({
      activities: [activity({ id: 'a1', date: MONDAY, plannedSession: prescription })],
      plannedSessions: [prescription],
    });

    expect(week.done.map((entry) => entry.id)).toEqual(['a1']);
    expect(week.remaining).toHaveLength(0);
  });

  it('marks the load unknown when nothing recorded carried one', () => {
    const week = build({ activities: [activity({ id: 'a1', date: MONDAY, load: null })] });

    // A zero meaning "not measured" would say the athlete did nothing.
    expect(week.doneLoadKnown).toBe(false);
    expect(week.done).toHaveLength(1);
  });

  it('sums recorded and prescribed loads separately', () => {
    const week = build({
      activities: [activity({ id: 'a1', date: MONDAY, load: 40 })],
      plannedSessions: [planned({ id: 'p1', date: SATURDAY, load: 70 })],
    });

    expect(week.doneLoad).toBe(40);
    expect(week.doneLoadKnown).toBe(true);
    expect(week.plannedLoad).toBe(70);
  });

  it('flags today so the week can be read from where the athlete stands', () => {
    const week = build({});

    expect(week.days.filter((day) => day.isToday).map((day) => day.date.getDate())).toEqual([27]);
  });
});

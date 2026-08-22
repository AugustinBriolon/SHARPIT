import { describe, expect, it } from 'vitest';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { buildThread } from './build-thread';

const PIVOT = new Date(2026, 7, 26, 12); // mercredi 26 août 2026

function activity(partial: Partial<ClientActivity> & { id: string }): ClientActivity {
  return {
    type: 'RUN',
    date: PIVOT,
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
    date: PIVOT,
    title: 'Endurance',
    durationMin: 60,
    intensity: 'ENDURANCE',
    load: 60,
    completed: false,
    activityId: null,
    ...partial,
  } as ClientPlannedSession;
}

const allWeeks = (weeks: ReturnType<typeof buildThread>) =>
  weeks.flatMap((w) => w.days.flatMap((d) => d.entries));

describe('buildThread', () => {
  it('pairs a performed session with the prescription it answers to', () => {
    const prescription = planned({ id: 'p1' });
    const entries = allWeeks(
      buildThread({
        activities: [activity({ id: 'a1', plannedSession: prescription })],
        plannedSessions: [prescription],
        pivot: PIVOT,
        daysBack: 28,
      }),
    );

    // One entry, not two: the same session must not appear as done and as planned.
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ kind: 'paired', id: 'a1' });
    expect(entries[0].planned?.id).toBe('p1');
  });

  it('keeps an unplanned session and an unperformed plan apart', () => {
    const entries = allWeeks(
      buildThread({
        activities: [activity({ id: 'a1' })],
        plannedSessions: [planned({ id: 'p1' })],
        pivot: PIVOT,
        daysBack: 28,
      }),
    );

    expect(entries.map((e) => e.kind).sort()).toEqual(['done', 'planned']);
  });

  it('drops a plan already linked to an activity, even without the reverse join', () => {
    const entries = allWeeks(
      buildThread({
        activities: [],
        plannedSessions: [planned({ id: 'p1', activityId: 'a1' })],
        pivot: PIVOT,
        daysBack: 28,
      }),
    );

    expect(entries).toHaveLength(0);
  });

  it('windows the past in days, and never the future', () => {
    const longAgo = new Date(2026, 5, 1);
    const farAhead = new Date(2026, 10, 1);
    const weeks = buildThread({
      activities: [activity({ id: 'old', date: longAgo })],
      plannedSessions: [planned({ id: 'ahead', date: farAhead })],
      pivot: PIVOT,
      daysBack: 28,
    });

    const ids = allWeeks(weeks).map((e) => e.id);
    expect(ids).not.toContain('old');
    expect(ids).toContain('ahead');
  });

  it('totals prescribed and performed load separately for each week', () => {
    const prescription = planned({ id: 'p1', load: 60 });
    const [week] = buildThread({
      activities: [activity({ id: 'a1', load: 45, plannedSession: prescription })],
      plannedSessions: [prescription, planned({ id: 'p2', load: 80 })],
      pivot: PIVOT,
      daysBack: 28,
    });

    expect(week.doneLoad).toBe(45);
    expect(week.plannedLoad).toBe(140);
    expect(week.isCurrent).toBe(true);
  });

  it('says when a week has sessions but no load, rather than reporting zero', () => {
    const [withoutLoad] = buildThread({
      activities: [activity({ id: 'a1', load: null })],
      plannedSessions: [],
      pivot: PIVOT,
      daysBack: 28,
    });
    expect(withoutLoad.doneLoad).toBe(0);
    expect(withoutLoad.doneLoadKnown).toBe(false);

    const [withLoad] = buildThread({
      activities: [activity({ id: 'a1', load: 45 })],
      plannedSessions: [],
      pivot: PIVOT,
      daysBack: 28,
    });
    expect(withLoad.doneLoadKnown).toBe(true);
  });

  it('marks a week as future only when no day of it has passed', () => {
    const nextWeek = new Date(2026, 8, 2);
    const weeks = buildThread({
      activities: [],
      plannedSessions: [planned({ id: 'p1', date: nextWeek })],
      pivot: PIVOT,
      daysBack: 28,
    });

    expect(weeks.at(-1)?.isFuture).toBe(true);
  });

  it('returns weeks in chronological order', () => {
    const weeks = buildThread({
      activities: [activity({ id: 'a1', date: new Date(2026, 7, 12) })],
      plannedSessions: [planned({ id: 'p1', date: new Date(2026, 8, 2) })],
      pivot: PIVOT,
      daysBack: 28,
    });

    const keys = weeks.map((w) => w.weekKey);
    expect(keys).toEqual([...keys].sort());
  });
});

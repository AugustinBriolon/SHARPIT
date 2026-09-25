import { describe, expect, it } from 'vitest';
import type { ClientPlannedSession } from '@/lib/query/types';
import {
  easeSession,
  plannedDayKey,
  rescheduleSession,
  shiftByOneDay,
  undoOf,
} from './session-adjust';

function session(partial: Partial<ClientPlannedSession> = {}): ClientPlannedSession {
  return {
    // Stored the way Prisma stores a `@db.Date`: the calendar day at UTC midnight.
    date: new Date('2026-08-26T00:00:00.000Z'),
    startTime: '07:30',
    durationMin: 60,
    load: 80,
    ...partial,
  } as ClientPlannedSession;
}

describe('shiftByOneDay', () => {
  it('moves the session to the next calendar day and touches nothing else', () => {
    const result = shiftByOneDay(session());
    expect(plannedDayKey(result.date!)).toBe('2026-08-27');
    expect(result.durationMin).toBeUndefined();
    expect(result.load).toBeUndefined();
    expect(result.startTime).toBeUndefined();
  });

  it('crosses a month boundary without inventing a 32nd', () => {
    const result = shiftByOneDay(session({ date: new Date('2026-08-31T00:00:00.000Z') }));
    expect(plannedDayKey(result.date!)).toBe('2026-09-01');
  });

  it('lands on the same day in every timezone', () => {
    // Read with local getters west of Greenwich this would fall back a day.
    expect(plannedDayKey(shiftByOneDay(session()).date!)).toBe('2026-08-27');
  });
});

describe('easeSession', () => {
  it('cuts duration and load together', () => {
    expect(easeSession(session())).toEqual({ durationMin: 45, load: 60 });
  });

  it('rounds to something a person would actually plan', () => {
    // 50 × 0.75 = 37.5 → 40, not 37.5.
    expect(easeSession(session({ durationMin: 50, load: null }))?.durationMin).toBe(40);
  });

  it('never eases a session below a usable length', () => {
    expect(easeSession(session({ durationMin: 5, load: null }))?.durationMin).toBe(5);
  });

  it('refuses when there is nothing to reduce', () => {
    expect(easeSession(session({ durationMin: null, load: null }))).toBeNull();
    expect(easeSession(session({ durationMin: 0, load: 0 }))).toBeNull();
  });
});

describe('rescheduleSession', () => {
  const day = (year: number, month: number, d: number) => ({ year, month, day: d });

  it('writes the day and the clock as the two columns they are', () => {
    const moved = rescheduleSession(session(), day(2026, 8, 29), '18:00');
    expect(plannedDayKey(moved!.date!)).toBe('2026-08-29');
    expect(moved?.startTime).toBe('18:00');
  });

  it('leaves the clock alone when only the day moves', () => {
    const moved = rescheduleSession(session(), day(2026, 8, 29), '07:30');
    expect(moved?.startTime).toBeUndefined();
    expect(plannedDayKey(moved!.date!)).toBe('2026-08-29');
  });

  it('leaves the day alone when only the clock moves', () => {
    const moved = rescheduleSession(session(), day(2026, 8, 26), '18:00');
    expect(moved?.date).toBeUndefined();
    expect(moved?.startTime).toBe('18:00');
  });

  it('refuses confirming the slot the session already has', () => {
    expect(rescheduleSession(session(), day(2026, 8, 26), '07:30')).toBeNull();
  });

  it('treats a session with no time as having none, not as having midnight', () => {
    const without = session({ startTime: null });
    expect(rescheduleSession(without, day(2026, 8, 26), null)).toBeNull();
    expect(rescheduleSession(without, day(2026, 8, 26), '06:00')?.startTime).toBe('06:00');
  });

  it('moves backwards as readily as forwards', () => {
    const moved = rescheduleSession(session(), day(2026, 8, 20), '07:30');
    expect(plannedDayKey(moved!.date!)).toBe('2026-08-20');
  });
});

describe('undoOf', () => {
  it('restores exactly the fields that were written', () => {
    const before = session();
    const applied = easeSession(before)!;
    expect(undoOf(before, applied)).toEqual({ durationMin: 60, load: 80 });
  });

  it('leaves untouched fields out, rather than rewriting them to themselves', () => {
    const before = session();
    const undo = undoOf(before, shiftByOneDay(before));
    expect(undo.durationMin).toBeUndefined();
    expect(plannedDayKey(undo.date!)).toBe('2026-08-26');
  });

  it('restores the clock when the clock was what moved', () => {
    const before = session();
    const applied = rescheduleSession(before, { year: 2026, month: 8, day: 26 }, '18:00')!;
    expect(undoOf(before, applied)).toEqual({ startTime: '07:30' });
  });
});

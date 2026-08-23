import { describe, expect, it } from 'vitest';
import type { ClientPlannedSession } from '@/lib/query/types';
import { easeSession, moveToDay, shiftByOneDay, undoOf } from './session-adjust';

function session(partial: Partial<ClientPlannedSession> = {}): ClientPlannedSession {
  return {
    date: new Date(2026, 7, 26, 9),
    durationMin: 60,
    load: 80,
    ...partial,
  } as ClientPlannedSession;
}

describe('shiftByOneDay', () => {
  it('moves the session to the next day and touches nothing else', () => {
    const result = shiftByOneDay(session());
    expect(result.date?.getDate()).toBe(27);
    expect(result.durationMin).toBeUndefined();
    expect(result.load).toBeUndefined();
  });

  it('crosses a month boundary without inventing a 32nd', () => {
    expect(shiftByOneDay(session({ date: new Date(2026, 7, 31) })).date?.getMonth()).toBe(8);
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

describe('moveToDay', () => {
  it('keeps the time of day when the date changes', () => {
    const moved = moveToDay(session(), new Date(2026, 7, 29));
    expect(moved?.date?.getDate()).toBe(29);
    expect(moved?.date?.getHours()).toBe(9);
  });

  it('refuses a drop back onto the same day', () => {
    expect(moveToDay(session(), new Date(2026, 7, 26, 18))).toBeNull();
  });

  it('moves backwards as readily as forwards', () => {
    expect(moveToDay(session(), new Date(2026, 7, 20))?.date?.getDate()).toBe(20);
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
    expect(undo.date?.getDate()).toBe(26);
  });
});

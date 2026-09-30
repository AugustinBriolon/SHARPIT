import { describe, expect, it } from 'vitest';
import type { ClientActivity, ClientPlannedSession } from '@sharpit/app/lib/query/types';
import { brickTransitionsSec, formatTransition } from './today-brick-lines';

const session = { id: 's' } as ClientPlannedSession;
const done = (date: string, duration: number | null) => ({
  session,
  activity: { date: new Date(date), duration } as ClientActivity,
});

describe('brickTransitionsSec', () => {
  it('measures from one leg’s end to the next one’s start', () => {
    expect(
      brickTransitionsSec([
        done('2026-09-30T12:23:34Z', 4_815),
        done('2026-09-30T13:45:53Z', 1_815),
      ]),
    ).toEqual([124]);
  });

  it('reads an overlap between watch files as no transition', () => {
    expect(
      brickTransitionsSec([done('2026-09-30T12:00:00Z', 3_600), done('2026-09-30T12:59:50Z', 600)]),
    ).toEqual([0]);
  });

  it('is unknown where a leg is not done or has no duration', () => {
    expect(
      brickTransitionsSec([done('2026-09-30T12:00:00Z', null), done('2026-09-30T13:00:00Z', 600)]),
    ).toEqual([null]);
    expect(
      brickTransitionsSec([done('2026-09-30T12:00:00Z', 600), { session, activity: null }]),
    ).toEqual([null]);
  });
});

describe('formatTransition', () => {
  it('reads as minutes and seconds, or seconds alone under a minute', () => {
    expect(formatTransition(124)).toBe('2 min 04');
    expect(formatTransition(45)).toBe('45 s');
  });
});

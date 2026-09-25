import { describe, expect, it } from 'vitest';
import { buildThreadCoachLine, findPivotEntry } from './thread-coach-line';
import type { ThreadEntry, ThreadWeek } from './thread-model';

function entry(partial: Partial<ThreadEntry> & { id: string }): ThreadEntry {
  return {
    dayKey: '2026-08-26',
    type: 'RUN',
    title: 'Footing',
    kind: 'planned',
    activity: null,
    planned: { load: 50, durationMin: 45 } as ThreadEntry['planned'],
    ...partial,
  } as ThreadEntry;
}

function week(entries: ThreadEntry[], partial: Partial<ThreadWeek> = {}): ThreadWeek {
  return {
    weekKey: '2026-W35',
    label: 'S35',
    start: new Date(2026, 7, 24),
    days: [{ dayKey: '2026-08-26', date: new Date(2026, 7, 26), entries }],
    doneLoad: 0,
    doneLoadKnown: true,
    plannedLoad: 300,
    isCurrent: true,
    isFuture: false,
    ...partial,
  };
}

describe('findPivotEntry', () => {
  it('picks the heaviest session still owed', () => {
    const pivot = findPivotEntry(
      week([
        entry({ id: 'light', planned: { load: 40 } as ThreadEntry['planned'] }),
        entry({ id: 'heavy', planned: { load: 130 } as ThreadEntry['planned'] }),
      ]),
    );
    expect(pivot?.id).toBe('heavy');
  });

  it('ignores what is already done — a pivot you cannot miss is not a pivot', () => {
    expect(findPivotEntry(week([entry({ id: 'a', kind: 'done' })]))).toBeNull();
  });

  it('falls back to duration when no load is prescribed', () => {
    const pivot = findPivotEntry(
      week([
        entry({ id: 'short', planned: { durationMin: 30 } as ThreadEntry['planned'] }),
        entry({ id: 'long', planned: { durationMin: 120 } as ThreadEntry['planned'] }),
      ]),
    );
    expect(pivot?.id).toBe('long');
  });
});

describe('buildThreadCoachLine', () => {
  it('names the session the week turns on', () => {
    const line = buildThreadCoachLine(
      week([entry({ id: 'p1', title: 'Sortie longue' })], { doneLoad: 200 }),
    );
    expect(line?.text).toContain('Sortie longue');
    expect(line?.text).toContain('point de bascule');
    expect(line?.pivotEntryId).toBe('p1');
  });

  it('says the work is still ahead when barely any of it is done', () => {
    const line = buildThreadCoachLine(week([entry({ id: 'p1' })], { doneLoad: 20 }));
    expect(line?.text).toContain('encore devant toi');
  });

  it('reports how a finished week landed instead of inventing a pivot', () => {
    const done = week([entry({ id: 'a', kind: 'done' })], { doneLoad: 290 });
    expect(buildThreadCoachLine(done)?.text).toContain('tenue');
    expect(buildThreadCoachLine(done)?.pivotEntryId).toBeNull();

    const short = week([entry({ id: 'a', kind: 'done' })], { doneLoad: 150 });
    expect(buildThreadCoachLine(short)?.text).toContain('50 %');
  });

  it('stays silent rather than saying something empty', () => {
    expect(buildThreadCoachLine(null)).toBeNull();
    expect(buildThreadCoachLine(week([], { plannedLoad: 0 }))).toBeNull();
  });
});

import { ActivityType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  groupHubDoneByDay,
  hubDoneCardAccessibleName,
  selectHubDoneEntries,
  selectHubRemainingEntries,
} from '@/lib/plan/plan-week-previews';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';

function doneEntry(id: string): ThreadEntry {
  return {
    id,
    dayKey: '2026-09-01',
    type: ActivityType.RUN,
    title: id,
    kind: 'done',
    activity: { id } as ThreadEntry['activity'],
    planned: null,
  };
}

describe('selectHubDoneEntries', () => {
  it('shows the most recent sessions first and keeps a short hub list', () => {
    const done = [doneEntry('a'), doneEntry('b'), doneEntry('c'), doneEntry('d'), doneEntry('e')];
    expect(selectHubDoneEntries(done)).toEqual({
      featured: [doneEntry('e'), doneEntry('d'), doneEntry('c'), doneEntry('b')],
      overflow: 1,
    });
  });

  it('returns every session when the week is shorter than the hub limit', () => {
    const done = [doneEntry('a')];
    expect(selectHubDoneEntries(done)).toEqual({
      featured: [doneEntry('a')],
      overflow: 0,
    });
  });

  it('groups consecutive realized sessions that share a day', () => {
    const featured = [
      { ...doneEntry('a'), dayKey: '2026-09-05', title: 'Course' },
      { ...doneEntry('b'), dayKey: '2026-09-05', title: 'Renfo' },
      { ...doneEntry('c'), dayKey: '2026-09-04', title: 'Vélo' },
    ];
    expect(groupHubDoneByDay(featured)).toEqual([
      { dayKey: '2026-09-05', entries: [featured[0], featured[1]] },
      { dayKey: '2026-09-04', entries: [featured[2]] },
    ]);
  });

  it('names a realized card with its day so the link stays unique', () => {
    expect(hubDoneCardAccessibleName('vendredi 4', 'Renfo Force')).toBe('vendredi 4 · Renfo Force');
  });
});

describe('selectHubRemainingEntries', () => {
  it('keeps the next two owed sessions in chronological order', () => {
    const remaining = [doneEntry('a'), doneEntry('b'), doneEntry('c')].map((entry) => ({
      ...entry,
      kind: 'planned' as const,
      activity: null,
      planned: { id: entry.id } as ThreadEntry['planned'],
    }));
    expect(selectHubRemainingEntries(remaining)).toEqual({
      featured: [remaining[0], remaining[1]],
      overflow: 1,
    });
  });

  it('drops the session already opened by the week decision', () => {
    const remaining = [doneEntry('a'), doneEntry('b'), doneEntry('c')].map((entry) => ({
      ...entry,
      kind: 'planned' as const,
      activity: null,
      planned: { id: entry.id } as ThreadEntry['planned'],
    }));
    expect(selectHubRemainingEntries(remaining, 'a')).toEqual({
      featured: [remaining[1], remaining[2]],
      overflow: 0,
    });
  });

  it('omits the remaining list when the decision already owns the only session', () => {
    const remaining = [
      {
        ...doneEntry('a'),
        kind: 'planned' as const,
        activity: null,
        planned: { id: 'a' } as ThreadEntry['planned'],
      },
    ];
    expect(selectHubRemainingEntries(remaining, 'a')).toEqual({
      featured: [],
      overflow: 0,
    });
  });
});

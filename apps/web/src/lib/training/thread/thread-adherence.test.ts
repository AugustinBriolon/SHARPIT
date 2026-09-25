import { describe, expect, it } from 'vitest';
import { buildThreadAdherence } from './thread-adherence';
import type { ThreadEntry, ThreadWeek } from './thread-model';

function entry(kind: ThreadEntry['kind'], id: string): ThreadEntry {
  return { id, dayKey: '2026-08-26', type: 'RUN', title: 't', kind, activity: null, planned: null };
}

function week(label: string, entries: ThreadEntry[], isFuture = false): ThreadWeek {
  return {
    weekKey: `2026-W${label.slice(1)}`,
    label,
    start: new Date(2026, 7, 24),
    days: [{ dayKey: '2026-08-26', date: new Date(2026, 7, 26), entries }],
    doneLoad: 0,
    doneLoadKnown: false,
    plannedLoad: 0,
    isCurrent: false,
    isFuture,
  };
}

describe('buildThreadAdherence', () => {
  it('counts sessions held against sessions asked for', () => {
    const result = buildThreadAdherence([
      week('S33', [entry('paired', 'a'), entry('paired', 'b'), entry('planned', 'c')]),
    ]);
    expect(result).toMatchObject({ completed: 2, prescribed: 3 });
    expect(result.ratio).toBeCloseTo(2 / 3);
  });

  it('ignores unplanned sessions — you cannot hold a plan you never made', () => {
    const result = buildThreadAdherence([week('S33', [entry('done', 'a')])]);
    expect(result.prescribed).toBe(0);
    expect(result.ratio).toBeNull();
  });

  it('does not grade weeks that have not happened yet', () => {
    const result = buildThreadAdherence([
      week('S33', [entry('paired', 'a')]),
      week('S36', [entry('planned', 'b'), entry('planned', 'c')], true),
    ]);
    expect(result).toMatchObject({ completed: 1, prescribed: 1 });
  });

  it('names the weakest week so the dip has somewhere to point', () => {
    const result = buildThreadAdherence([
      week('S33', [entry('paired', 'a'), entry('planned', 'b')]),
      week('S34', [entry('paired', 'c')]),
    ]);
    expect(result.worstWeekLabel).toBe('S33');
  });

  it('names nothing when every prescribed session was held', () => {
    const result = buildThreadAdherence([week('S33', [entry('paired', 'a')])]);
    expect(result.worstWeekLabel).toBeNull();
  });
});

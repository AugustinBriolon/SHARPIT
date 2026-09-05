import { describe, expect, it } from 'vitest';
import { buildPlanLoadTrend } from '@/lib/plan/plan-load-trend';
import type { ThreadWeek } from '@/lib/training/thread/thread-model';

function week(partial: Partial<ThreadWeek> & { weekKey: string }): ThreadWeek {
  return {
    label: `S${partial.weekKey.slice(-2)}`,
    start: new Date(2026, 0, 1),
    days: [],
    doneLoad: 0,
    doneLoadKnown: false,
    plannedLoad: 0,
    isCurrent: false,
    isFuture: false,
    ...partial,
  };
}

describe('buildPlanLoadTrend', () => {
  it('is absent until two weeks can be compared', () => {
    expect(buildPlanLoadTrend([week({ weekKey: '2026-W33', doneLoad: 200 })])).toBeNull();
  });

  it('keeps four weeks around the current one', () => {
    const weeks = Array.from({ length: 8 }, (_, index) =>
      week({
        weekKey: `2026-W${String(index + 30).padStart(2, '0')}`,
        doneLoad: 100 + index,
        isCurrent: index === 6,
      }),
    );
    const trend = buildPlanLoadTrend(weeks);
    expect(trend?.bars).toHaveLength(4);
    expect(trend?.bars.some((bar) => bar.state === 'current')).toBe(true);
  });
});

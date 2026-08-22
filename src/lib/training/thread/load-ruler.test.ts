import { describe, expect, it } from 'vitest';
import { buildLoadRuler, rulerRangeLabel } from './load-ruler';
import type { ThreadWeek } from './thread-model';

function week(partial: Partial<ThreadWeek> & { weekKey: string }): ThreadWeek {
  return {
    label: `S${partial.weekKey.slice(-2)}`,
    start: new Date(2026, 0, 1),
    days: [],
    doneLoad: 0,
    plannedLoad: 0,
    isCurrent: false,
    isFuture: false,
    ...partial,
  };
}

describe('buildLoadRuler', () => {
  it('reads a past week from what was recorded and a future one from the plan', () => {
    const bars = buildLoadRuler([
      week({ weekKey: '2026-W33', doneLoad: 200, plannedLoad: 300 }),
      week({ weekKey: '2026-W34', doneLoad: 0, plannedLoad: 400, isFuture: true }),
    ]);

    expect(bars[0]).toMatchObject({ load: 200, state: 'past' });
    expect(bars[1]).toMatchObject({ load: 400, state: 'future' });
  });

  it('scales every bar against the tallest in view', () => {
    const bars = buildLoadRuler([
      week({ weekKey: '2026-W33', doneLoad: 100 }),
      week({ weekKey: '2026-W34', doneLoad: 400 }),
    ]);

    expect(bars[0].height).toBeCloseTo(0.25);
    expect(bars[1].height).toBe(1);
  });

  it('keeps the current week inside the window when history runs long', () => {
    const weeks = Array.from({ length: 30 }, (_, i) =>
      week({ weekKey: `2026-W${String(i + 1).padStart(2, '0')}`, doneLoad: 100 }),
    );
    weeks[20] = { ...weeks[20], isCurrent: true };

    const bars = buildLoadRuler(weeks);
    expect(bars).toHaveLength(9);
    expect(bars.some((bar) => bar.state === 'current')).toBe(true);
  });

  it('survives a window where nothing was recorded at all', () => {
    const bars = buildLoadRuler([week({ weekKey: '2026-W33' })]);
    expect(bars[0].height).toBe(0);
  });

  it('returns nothing rather than an empty ruler', () => {
    expect(buildLoadRuler([])).toEqual([]);
  });
});

describe('rulerRangeLabel', () => {
  it('names the span it covers', () => {
    const bars = buildLoadRuler([
      week({ weekKey: '2026-W31', doneLoad: 10 }),
      week({ weekKey: '2026-W39', doneLoad: 10 }),
    ]);
    expect(rulerRangeLabel(bars)).toBe('S31 → S39');
  });

  it('does not print an arrow pointing at itself', () => {
    expect(rulerRangeLabel(buildLoadRuler([week({ weekKey: '2026-W31', doneLoad: 10 })]))).toBe(
      'S31',
    );
  });
});

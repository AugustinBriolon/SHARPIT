import { describe, expect, it } from 'vitest';
import { JOURNAL_HABIT_AXES, axisPosition, axisTicks } from '@/lib/journal/journal-habit-axis';

describe('journal habit axes', () => {
  it('labels sleep ticks in hours and spans the edges of the track', () => {
    const ticks = axisTicks(JOURNAL_HABIT_AXES.sleepMinutes);

    expect(ticks.map((tick) => tick.label)).toEqual(['5 h 30', '6 h 30', '7 h 30', '8 h 30']);
    expect(ticks[0]?.pct).toBe(0);
    expect(ticks[ticks.length - 1]?.pct).toBe(100);
  });

  it('places a point on a tick exactly where the tick sits', () => {
    for (const axis of Object.values(JOURNAL_HABIT_AXES)) {
      for (const tick of axisTicks(axis)) {
        expect(axisPosition(axis, tick.value).pct).toBe(tick.pct);
      }
    }
  });

  it('clamps out-of-axis medians and flags the overflow side', () => {
    const axis = JOURNAL_HABIT_AXES.recoveryScore;

    expect(axisPosition(axis, 12)).toEqual({ pct: 0, overflow: 'low' });
    expect(axisPosition(axis, 97)).toEqual({ pct: 100, overflow: 'high' });
    expect(axisPosition(axis, 60)).toEqual({ pct: 50, overflow: null });
  });
});

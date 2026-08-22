import { describe, expect, it } from 'vitest';
import { partitionThread } from './partition-thread';
import type { ThreadDay, ThreadEntry, ThreadWeek } from './thread-model';

function day(dayKey: string): ThreadDay {
  const [y, m, d] = dayKey.split('-').map(Number);
  const entry: ThreadEntry = {
    id: dayKey,
    dayKey,
    type: 'RUN',
    title: dayKey,
    kind: 'done',
    activity: null,
    planned: null,
  };
  return { dayKey, date: new Date(y!, m! - 1, d!), entries: [entry] };
}

function week(weekKey: string, dayKeys: string[]): ThreadWeek {
  return {
    weekKey,
    label: `S${weekKey.slice(-2)}`,
    start: new Date(2026, 7, 17),
    days: dayKeys.map(day),
    doneLoad: 0,
    doneLoadKnown: false,
    plannedLoad: 0,
    isCurrent: false,
    isFuture: false,
  };
}

const PIVOT = '2026-08-26';

describe('partitionThread', () => {
  it('puts today at the head of what is coming, not at the end of the past', () => {
    const { upcoming, past } = partitionThread(
      [week('2026-W35', ['2026-08-25', PIVOT, '2026-08-28'])],
      PIVOT,
    );

    expect(upcoming[0].days.map((d) => d.dayKey)).toEqual([PIVOT, '2026-08-28']);
    expect(past[0].days.map((d) => d.dayKey)).toEqual(['2026-08-25']);
  });

  it('runs the past backwards — yesterday explains today, last month does not', () => {
    const { past } = partitionThread(
      [
        week('2026-W34', ['2026-08-18', '2026-08-20']),
        week('2026-W35', ['2026-08-24', '2026-08-25']),
      ],
      PIVOT,
    );

    expect(past.map((w) => w.weekKey)).toEqual(['2026-W35', '2026-W34']);
    expect(past[0].days.map((d) => d.dayKey)).toEqual(['2026-08-25', '2026-08-24']);
    expect(past[1].days.map((d) => d.dayKey)).toEqual(['2026-08-20', '2026-08-18']);
  });

  it('keeps what is coming in the order it will happen', () => {
    const { upcoming } = partitionThread(
      [week('2026-W35', [PIVOT, '2026-08-28']), week('2026-W36', ['2026-09-01'])],
      PIVOT,
    );

    expect(upcoming.map((w) => w.weekKey)).toEqual(['2026-W35', '2026-W36']);
    expect(upcoming[1].days.map((d) => d.dayKey)).toEqual(['2026-09-01']);
  });

  it('lets a week straddling today appear on both sides, holding only its own days', () => {
    const { upcoming, past } = partitionThread([week('2026-W35', ['2026-08-24', PIVOT])], PIVOT);

    expect(upcoming).toHaveLength(1);
    expect(past).toHaveLength(1);
    expect(upcoming[0].weekKey).toBe(past[0].weekKey);
  });

  it('drops a side entirely rather than leaving an empty week on it', () => {
    const { upcoming, past } = partitionThread([week('2026-W34', ['2026-08-18'])], PIVOT);
    expect(upcoming).toEqual([]);
    expect(past).toHaveLength(1);
  });
});

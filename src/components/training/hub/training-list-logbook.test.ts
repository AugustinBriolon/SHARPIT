import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';

import type { ClientActivity } from '@/lib/query/types';
import {
  estimateActivityHistoryRowSize,
  flattenActivityWeekGroups,
  formatWeekSessionCount,
  groupActivitiesByWeek,
} from '@/components/training/hub/training-list-logbook';

function stubActivity(id: string, date: string): ClientActivity {
  return {
    id,
    date: new Date(date),
    type: ActivityType.RUN,
  } as ClientActivity;
}

describe('formatWeekSessionCount', () => {
  it('pluralizes séance', () => {
    expect(formatWeekSessionCount(1)).toBe('1 séance');
    expect(formatWeekSessionCount(4)).toBe('4 séances');
  });
});

describe('groupActivitiesByWeek', () => {
  it('sorts weeks newest-first and activities within a week by date desc', () => {
    const activities = [
      stubActivity('a', '2026-09-01T08:00:00.000Z'),
      stubActivity('b', '2026-09-05T08:00:00.000Z'),
      stubActivity('c', '2026-09-04T08:00:00.000Z'),
    ];
    const groups = groupActivitiesByWeek(activities);
    expect(groups.length).toBeGreaterThan(0);
    const firstWeek = groups[0]!;
    expect(firstWeek.activities.map((activity) => activity.id)).toEqual(['b', 'c', 'a']);
  });
});

describe('flattenActivityWeekGroups', () => {
  it('emits a week header then each activity in order', () => {
    const groups = [
      {
        key: '2026-09-01',
        label: 'Cette semaine',
        activities: [
          stubActivity('b', '2026-09-05T08:00:00.000Z'),
          stubActivity('c', '2026-09-04T08:00:00.000Z'),
        ],
      },
      {
        key: '2026-08-25',
        label: 'Semaine du 25 août',
        activities: [stubActivity('a', '2026-08-26T08:00:00.000Z')],
      },
    ];

    const rows = flattenActivityWeekGroups(groups);
    expect(rows.map((row) => row.key)).toEqual([
      'week-2026-09-01',
      'b',
      'c',
      'week-2026-08-25',
      'a',
    ]);
    expect(rows[0]).toMatchObject({ kind: 'week', count: 2, label: 'Cette semaine' });
    expect(rows[1]).toMatchObject({ kind: 'activity', key: 'b' });
  });

  it('estimates smaller height for week headers than activity cards', () => {
    const week = flattenActivityWeekGroups([
      {
        key: 'w',
        label: 'Cette semaine',
        activities: [stubActivity('a', '2026-09-01T08:00:00.000Z')],
      },
    ]);
    expect(estimateActivityHistoryRowSize(week[0]!)).toBeLessThan(
      estimateActivityHistoryRowSize(week[1]!),
    );
  });
});

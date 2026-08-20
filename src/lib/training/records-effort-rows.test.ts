import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    performanceRecord: { findMany: vi.fn() },
  },
}));

import { prisma } from '@/lib/prisma';
import {
  excludeEffortRows,
  getPerformanceRecordsForActivity,
  isEffortRecordGroup,
} from './records';

const findMany = vi.mocked(prisma.performanceRecord.findMany);

describe('effort rows are not records', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([]);
  });

  it('flags the scatter-reference groups only', () => {
    expect(isEffortRecordGroup('run-effort')).toBe(true);
    expect(isEffortRecordGroup('bike-effort')).toBe(true);
    expect(isEffortRecordGroup('run')).toBe(false);
    expect(isEffortRecordGroup('run-best')).toBe(false);
    expect(isEffortRecordGroup('power')).toBe(false);
  });

  it('drops effort rows from a record row batch', () => {
    const rows = [
      { group: 'run', category: 'run-distance' },
      { group: 'run-effort', category: 'run-effort-0' },
      { group: 'bike-effort', category: 'bike-effort-3' },
      { group: 'power', category: 'power-300' },
    ];

    expect(excludeEffortRows(rows).map((r) => r.category)).toEqual(['run-distance', 'power-300']);
  });

  it('never surfaces an effort row as an activity record chip', async () => {
    await getPerformanceRecordsForActivity('activity-1');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          activityId: 'activity-1',
          rank: 1,
          group: { notIn: ['run-effort', 'bike-effort'] },
        },
      }),
    );
  });
});

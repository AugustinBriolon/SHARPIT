import { describe, expect, it } from 'vitest';
import { rowToActivityStatusStore } from './activity-status-service';

describe('activity-status-service', () => {
  it('maps a DB row to the activity status store', () => {
    expect(
      rowToActivityStatusStore({
        status: 'paused',
        retentionKind: 'until_date',
        untilDate: new Date('2026-09-20T00:00:00.000Z'),
        travelId: 'travel-1',
        updatedAt: new Date('2026-09-09T10:00:00.000Z'),
      }),
    ).toEqual({
      version: 2,
      status: 'paused',
      retention: { kind: 'until_date', untilDate: '2026-09-20' },
      travelId: 'travel-1',
      updatedAt: '2026-09-09T10:00:00.000Z',
    });
  });

  it('migrates unknown status to actif', () => {
    expect(
      rowToActivityStatusStore({
        status: 'vacation',
        retentionKind: 'until_modified',
        untilDate: null,
        travelId: null,
        updatedAt: new Date('2026-09-09T10:00:00.000Z'),
      }).status,
    ).toBe('active');
  });
});

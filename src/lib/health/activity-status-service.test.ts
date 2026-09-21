import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rowToActivityStatusStore } from './activity-status-service';

describe('activity-status-service', () => {
  // The mapper resolves a passed deadline back to "active", so a fixed deadline in the
  // fixture needs a fixed "now" before it, or the test expires with the calendar.
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

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

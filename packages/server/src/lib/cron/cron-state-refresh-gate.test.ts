import { describe, expect, it } from 'vitest';
import { DEMO_CLERK_USER_ID } from '@sharpit/app/lib/demo/demo-session';
import {
  cronSyncAthleteFilter,
  shouldRefreshAthleteStateAfterCronSync,
} from '@sharpit/server/lib/cron/cron-state-refresh-gate';

describe('cronSyncAthleteFilter', () => {
  it('walks live athletes but leaves the demo account to its nightly reseed', () => {
    expect(cronSyncAthleteFilter()).toEqual({
      deletedAt: null,
      clerkUserId: { not: DEMO_CLERK_USER_ID },
    });
  });
});

describe('shouldRefreshAthleteStateAfterCronSync', () => {
  const nothingNew = {
    evidenceWrittenDuringSync: false,
    backfilledStreamCount: 0,
    hasSnapshotForTrainingDay: true,
  };

  it('skips the rebuild when the sync brought nothing and today is already computed', () => {
    expect(shouldRefreshAthleteStateAfterCronSync(nothingNew)).toBe(false);
  });

  it('rebuilds when a provider wrote evidence', () => {
    expect(
      shouldRefreshAthleteStateAfterCronSync({ ...nothingNew, evidenceWrittenDuringSync: true }),
    ).toBe(true);
  });

  it('rebuilds when activity streams were backfilled', () => {
    expect(
      shouldRefreshAthleteStateAfterCronSync({ ...nothingNew, backfilledStreamCount: 2 }),
    ).toBe(true);
  });

  it('rebuilds on a new training day even without new evidence', () => {
    expect(
      shouldRefreshAthleteStateAfterCronSync({ ...nothingNew, hasSnapshotForTrainingDay: false }),
    ).toBe(true);
  });
});

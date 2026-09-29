import { DEMO_CLERK_USER_ID } from '@sharpit/app/lib/demo/demo-session';

/**
 * Athletes the scheduled sync walks. The demo account is left out: it has no live provider
 * and `/api/cron/demo-reseed` already rebuilds its state every night (ADR-026, ADR-049).
 */
export function cronSyncAthleteFilter() {
  return { deletedAt: null, clerkUserId: { not: DEMO_CLERK_USER_ID } };
}

/**
 * Rebuilding the athlete state is the cron's heaviest CPU step. It only pays off when the sync
 * brought evidence in, or when today's snapshot does not exist yet — a new training day moves
 * the load curves and the phase even without new data (ADR-054).
 */
export function shouldRefreshAthleteStateAfterCronSync(input: {
  evidenceWrittenDuringSync: boolean;
  backfilledStreamCount: number;
  hasSnapshotForTrainingDay: boolean;
}): boolean {
  if (!input.hasSnapshotForTrainingDay) {
    return true;
  }
  return input.evidenceWrittenDuringSync || input.backfilledStreamCount > 0;
}

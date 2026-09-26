import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { getAthleteProfile } from '@sharpit/server/lib/queries';
import { hasProAccess } from '@sharpit/server/lib/access/tier';
import { WeeklyReviewClient } from '@/components/training/weekly-review/weekly-review-client';
import { WeeklyReviewLocked } from '@/components/training/weekly-review/weekly-review-locked';

/** Server-side tier check — the API route re-checks independently, this only
 * decides which client component to mount. */
export async function WeeklyReviewGate() {
  const athleteId = await getCurrentAthleteId();
  const profile = await getAthleteProfile(athleteId);

  if (!hasProAccess(profile?.tier ?? 'FREE')) {
    return <WeeklyReviewLocked />;
  }

  return <WeeklyReviewClient />;
}

import { getViewer } from '@/server/viewer';
import { WeeklyReviewClient } from '@/components/training/weekly-review/weekly-review-client';
import { WeeklyReviewLocked } from '@/components/training/weekly-review/weekly-review-locked';

/** Server-side tier check — the API route re-checks independently, this only
 * decides which client component to mount. */
export async function WeeklyReviewGate() {
  if (!(await getViewer()).isPro) {
    return <WeeklyReviewLocked />;
  }

  return <WeeklyReviewClient />;
}

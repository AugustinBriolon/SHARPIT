import { Suspense } from 'react';
import { HikeTripsList } from '@/components/training/trip/hike-trips-list';

/** Suspense for the back link's nav-stack read — the list owns its skeletons. */
export default function TrainingTripsPage() {
  return (
    <Suspense>
      <HikeTripsList />
    </Suspense>
  );
}

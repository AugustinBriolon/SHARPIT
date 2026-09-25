import { Suspense } from 'react';
import { HikeTripsList, HikeTripsListSkeleton } from '@/components/training/trip/hike-trips-list';

/** Suspense for the back link's nav-stack read — header + list pulses in fallback. */
export default function HikeTripsPage() {
  return (
    <Suspense fallback={<HikeTripsListSkeleton />}>
      <HikeTripsList />
    </Suspense>
  );
}

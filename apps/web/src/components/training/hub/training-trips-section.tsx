'use client';

import { InstrumentListChip } from '@/components/ui/instruments/instrument-list-chip';
import { useHikeTrips } from '@/hooks/use-data';
import { buildHikeTripListMeta } from '@/lib/activity/hike/hike-trip-summary';

const PREVIEW_LIMIT = 3;

/**
 * Recent multi-day hikes on the training hub.
 * Renders nothing until trips exist — they are created from the history
 * multi-select, so an empty block here would be noise, not an affordance.
 */
export function TrainingTripsSection({
  renderHeader,
}: {
  renderHeader: (props: { title: string; href: string; cta: string }) => React.ReactNode;
}) {
  const { data: trips } = useHikeTrips();
  if (!trips || trips.length === 0) {
    return null;
  }

  return (
    <section className="min-w-0">
      {renderHeader({ title: 'Séjours', href: '/activite/sejours', cta: 'Tous les séjours' })}
      <ul className="flex flex-col gap-2">
        {trips.slice(0, PREVIEW_LIMIT).map((trip) => (
          <li key={trip.id}>
            <InstrumentListChip
              href={`/activite/sejours/${trip.id}`}
              meta={buildHikeTripListMeta(trip.summary)}
              title={trip.name}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

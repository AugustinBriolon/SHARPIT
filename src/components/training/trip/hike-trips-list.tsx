'use client';

import { MapPinned } from 'lucide-react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { InstrumentListChip } from '@/components/ui/instruments/instrument-list-chip';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { useHikeTrips } from '@/hooks/use-data';
import { buildHikeTripListMeta } from '@/lib/activity/hike/hike-trip-summary';

function TripsPageHeader() {
  return (
    <>
      <MobileBackLink fallbackHref="/activite" fallbackLabel="Activité" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Activité</p>
        <h1 className="text-page-title mt-1">Séjours</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Randonnées de plusieurs jours regroupées — étapes et totaux par séjour.
        </p>
      </StickyHeader>
    </>
  );
}

/** Stable trips list chrome for Suspense fallback and query pending state. */
export function HikeTripsListSkeleton() {
  return (
    <div className="space-y-6">
      <TripsPageHeader />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="chip-surface-lg rounded-analysis h-[4.25rem] animate-pulse"
            aria-hidden
          />
        ))}
      </div>
    </div>
  );
}

/** Realised multi-day hikes. Planned travel lives in the coach memory, not here. */
export function HikeTripsList() {
  const tripsQuery = useHikeTrips();

  if (tripsQuery.isPending) {
    return <HikeTripsListSkeleton />;
  }

  if (tripsQuery.isError) {
    return (
      <div className="space-y-6">
        <TripsPageHeader />
        <p
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-6 text-sm"
          role="alert"
        >
          Impossible de charger les séjours. Réessaie dans un instant.
        </p>
      </div>
    );
  }

  const trips = tripsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <TripsPageHeader />

      {trips.length === 0 ? (
        <InkEmptyState
          description="Sélectionne plusieurs randonnées depuis l'historique pour les regrouper."
          icon={MapPinned}
          title="Aucun séjour"
          bleed
        />
      ) : (
        <ul className="space-y-2">
          {trips.map((trip) => (
            <li key={trip.id}>
              {/* No type badge: every trip is a hike, so it would carry no signal. */}
              <InstrumentListChip
                href={`/training/trips/${trip.id}`}
                meta={buildHikeTripListMeta(trip.summary)}
                title={trip.name}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

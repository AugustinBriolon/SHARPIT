import { notFound } from 'next/navigation';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import {
  HikeTripActionsMenu,
  HikeTripAddStepControl,
} from '@/components/training/trip/hike-trip-actions';
import { HikeTripElevationProfile } from '@/components/training/trip/hike-trip-elevation-profile';
import { HikeTripInkBand } from '@/components/training/trip/hike-trip-ink-band';
import { HikeTripTimeline } from '@/components/training/trip/hike-trip-timeline';
import { HikeTripWaypoints } from '@/components/training/trip/hike-trip-waypoints';
import { buildHikeTripElevationProfile } from '@/lib/activity/hike-trip-elevation';
import { buildHikeTripSummary } from '@/lib/activity/hike-trip-summary';
import { getHikeTripById } from '@/lib/queries';

type PageProps = { params: Promise<{ id: string }> };

export default async function HikeTripDetailPage({ params }: PageProps) {
  const { id } = await params;
  const trip = await getHikeTripById(id);

  if (!trip) notFound();

  const summary = buildHikeTripSummary(trip.activities);
  const profile = buildHikeTripElevationProfile(trip.activities);

  return (
    <div className="relative z-0 space-y-6 sm:space-y-8">
      <MobileBackLink fallbackHref="/training/trips" fallbackLabel="Séjours" showOnDesktop />

      <HikeTripInkBand
        actions={<HikeTripActionsMenu tripId={trip.id} tripName={trip.name} />}
        name={trip.name}
        profile={profile}
        summary={summary}
      />

      {/* Below the band on mobile; the band already carries it from lg up. */}
      {profile ? (
        <div className="analysis-panel rounded-analysis-lg px-4 py-4 lg:hidden">
          <HikeTripElevationProfile profile={profile} />
        </div>
      ) : null}

      <HikeTripWaypoints labels={summary.locationLabels} />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-section-title">Étapes</h2>
          <HikeTripAddStepControl tripId={trip.id} />
        </div>
        <HikeTripTimeline members={trip.activities} tripId={trip.id} />
      </section>
    </div>
  );
}

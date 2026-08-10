import { Suspense } from 'react';
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
import { Skeleton } from '@/components/ui/skeleton';
import { buildHikeTripElevationProfile } from '@/lib/activity/hike-trip-elevation';
import { buildHikeTripSummary } from '@/lib/activity/hike-trip-summary';
import { getHikeTripById } from '@/lib/queries';

type PageProps = { params: Promise<{ id: string }> };

function HikeTripDetailSkeleton() {
  return (
    <>
      <section className="surface-ink px-5 py-6 sm:px-7 sm:py-7" aria-busy>
        <div className="flex min-w-0 items-start gap-3 pr-10">
          <Skeleton className="size-11 shrink-0 rounded-full border-0 sm:size-12" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-12 rounded-full border-0" />
            <Skeleton className="h-8 w-48 max-w-full rounded-full border-0" />
            <Skeleton className="h-4 w-56 max-w-full rounded-full border-0" />
          </div>
        </div>
        <dl className="divide-ink-surface-foreground/15 mt-6 grid grid-cols-3 divide-x lg:mt-7">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="min-w-0 px-2.5 first:pl-0 last:pr-0 sm:px-5">
              <Skeleton className="h-3 w-14 rounded-full border-0" />
              <Skeleton className="mt-2 h-7 w-16 rounded-full border-0" />
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-16 rounded-full border-0" />
          <Skeleton className="rounded-analysis h-9 w-24 border-0" />
        </div>
        <div className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="rounded-analysis-lg h-20 w-full border-0" />
          ))}
        </div>
      </section>
    </>
  );
}

async function HikeTripDetail({ params }: PageProps) {
  const { id } = await params;
  const trip = await getHikeTripById(id);

  if (!trip) notFound();

  const summary = buildHikeTripSummary(trip.activities);
  const profile = buildHikeTripElevationProfile(trip.activities);

  return (
    <>
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
    </>
  );
}

export default function HikeTripDetailPage({ params }: PageProps) {
  return (
    <div className="relative z-0 space-y-6 sm:space-y-8">
      <MobileBackLink fallbackHref="/training/trips" fallbackLabel="Séjours" showOnDesktop />

      {/* The trip id is only known at request time — the back link above is the shell. */}
      <Suspense fallback={<HikeTripDetailSkeleton />}>
        <HikeTripDetail params={params} />
      </Suspense>
    </div>
  );
}

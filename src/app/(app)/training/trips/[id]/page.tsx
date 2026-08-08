import { notFound } from 'next/navigation';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import {
  HikeTripAddStepControl,
  HikeTripPageHeader,
} from '@/components/training/trip/hike-trip-actions';
import { HikeTripHero } from '@/components/training/trip/hike-trip-hero';
import { HikeTripTimeline } from '@/components/training/trip/hike-trip-timeline';
import { buildHikeTripSummary } from '@/lib/activity/hike-trip-summary';
import { getHikeTripById } from '@/lib/queries';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ id: string }> };

export default async function HikeTripDetailPage({ params }: PageProps) {
  const { id } = await params;
  const trip = await getHikeTripById(id);

  if (!trip) notFound();

  const summary = buildHikeTripSummary(trip.activities);

  return (
    <div className="relative z-0 space-y-6 sm:space-y-8">
      <MobileBackLink fallbackHref="/training" fallbackLabel="Training" showOnDesktop />

      <HikeTripPageHeader name={trip.name} summary={summary} tripId={trip.id} />

      <HikeTripHero summary={summary} />

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

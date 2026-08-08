'use client';

import { ActivityType } from '@prisma/client';
import { MapPinned } from 'lucide-react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { InstrumentListChip } from '@/components/ui/instrument-list-chip';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { useHikeTrips } from '@/hooks/use-data';
import type { HikeTripSummary } from '@/lib/activity/hike-trip-summary';
import { formatDate, formatDistance, formatDuration } from '@/lib/format';
import type { ClientHikeTripListItem } from '@/lib/query/types';

function formatTripDateRange(start: Date, end: Date): string {
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

function formatShortTripTotals(summary: HikeTripSummary): string {
  const parts: string[] = [];

  if (summary.memberCount > 0) {
    parts.push(`${summary.memberCount} étape${summary.memberCount > 1 ? 's' : ''}`);
  }
  if (summary.distanceM != null) {
    parts.push(formatDistance(summary.distanceM));
  }
  if (summary.durationSec != null) {
    parts.push(formatDuration(summary.durationSec));
  }
  if (summary.elevationM != null) {
    parts.push(`D+ ${Math.round(summary.elevationM)} m`);
  }

  return parts.join(' · ');
}

function buildTripMeta(summary: HikeTripSummary): string[] {
  const meta: string[] = [formatTripDateRange(summary.startAt, summary.endAt)];
  const totals = formatShortTripTotals(summary);
  if (totals) meta.push(totals);
  return meta;
}

function HikeTripListRow({ trip }: { trip: ClientHikeTripListItem }) {
  return (
    <InstrumentListChip
      activityType={ActivityType.HIKE}
      href={`/training/trips/${trip.id}`}
      meta={buildTripMeta(trip.summary)}
      title={trip.name}
    />
  );
}

export function HikeTripsList() {
  const tripsQuery = useHikeTrips();

  if (tripsQuery.isPending) {
    return (
      <div className="space-y-6">
        <MobileBackLink href="/settings" label="Réglages" showOnDesktop />
        <StickyHeader>
          <p className="text-label">Réglages</p>
          <h1 className="text-page-title mt-1">Déplacements</h1>
        </StickyHeader>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="chip-surface-lg rounded-analysis h-[4.25rem] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (tripsQuery.isError) {
    return (
      <div className="space-y-6">
        <MobileBackLink href="/settings" label="Réglages" showOnDesktop />
        <p
          className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-6 text-sm"
          role="alert"
        >
          Impossible de charger les déplacements. Réessaie dans un instant.
        </p>
      </div>
    );
  }

  const trips = tripsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <MobileBackLink href="/settings" label="Réglages" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Réglages</p>
        <h1 className="text-page-title mt-1">Déplacements</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Dossiers de randonnées liées — historique et agrégats par déplacement.
        </p>
      </StickyHeader>

      {trips.length === 0 ? (
        <InkEmptyState
          description="Lie des randonnées depuis Training."
          icon={MapPinned}
          title="Aucun déplacement"
          bleed
        />
      ) : (
        <ul className="space-y-2">
          {trips.map((trip) => (
            <li key={trip.id}>
              <HikeTripListRow trip={trip} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

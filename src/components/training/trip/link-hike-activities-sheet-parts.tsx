'use client';

import { ActivityType } from '@prisma/client';
import { Mountain } from 'lucide-react';
import { buildHikeTripMemberMeta } from '@/components/training/trip/hike-trip-timeline';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { InstrumentListChip } from '@/components/ui/instruments/instrument-list-chip';
import type { ClientActivity } from '@/lib/query/types';
import { cn } from '@/lib/utils';

function toHikeMemberMeta(activity: ClientActivity) {
  return buildHikeTripMemberMeta({
    ...activity,
    observedLocationLabel: null,
    hikeMetrics: activity.hikeMetrics
      ? {
          distanceM: activity.hikeMetrics.distanceM ?? null,
          elevationM: activity.hikeMetrics.elevationM ?? null,
          elevationLossM: null,
        }
      : null,
  });
}

export function LinkHikeSeedActivity({ seed }: { seed: ClientActivity }) {
  return (
    <div className="space-y-2">
      <p className="text-label text-muted-foreground">Cette séance</p>
      <InstrumentListChip
        activityType={ActivityType.HIKE}
        className="ring-primary/30 ring-1"
        meta={toHikeMemberMeta(seed)}
        showArrow={false}
        title={seed.title?.trim() || 'Randonnée'}
      />
    </div>
  );
}

export function LinkHikeOtherActivities({
  activities,
  selectedIds,
  onToggle,
}: {
  activities: ClientActivity[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-label text-muted-foreground">
        Autres randonnées ({selectedIds.size} sélectionnée
        {selectedIds.size > 1 ? 's' : ''})
      </p>
      {activities.length === 0 ? (
        <InkEmptyState
          description="Il faut au moins une autre randonnée libre pour créer un séjour."
          icon={Mountain}
          title="Aucune autre randonnée disponible"
          bleed
        />
      ) : (
        <ul className="space-y-2">
          {activities.map((activity) => {
            const selected = selectedIds.has(activity.id);
            return (
              <li key={activity.id}>
                <InstrumentListChip
                  activityType={ActivityType.HIKE}
                  className={cn(selected && 'ring-primary/40 ring-2')}
                  meta={toHikeMemberMeta(activity)}
                  showArrow={false}
                  title={activity.title?.trim() || 'Randonnée'}
                  onClick={() => onToggle(activity.id)}
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

'use client';

import { ActivityType } from '@prisma/client';
import { type ReactNode } from 'react';
import { useActivityStream } from '@/hooks/use-data';
import {
  ActivityInsightsLoading,
  ActivityInsightsUnavailable,
} from '@/components/training/activity/insights/activity-insights-parts';
import { ActivityInsightsContent } from '@/components/training/activity/insights/activity-insights-content';
import { buildActivityInsightsComposition } from '@/components/training/activity/insights/activity-insights-helpers';

/**
 * Endurance detail body: parcours | lecture coach (+ zones), then splits / profiles.
 * Sport hue is reserved for the map polyline — chrome stays neutral.
 */
export function ActivityInsights({
  activityId,
  type,
  coachPanel,
  expectMap = true,
}: {
  activityId: string;
  type: ActivityType;
  /** Coach reading — sits beside the route on large screens. */
  coachPanel?: ReactNode;
  /**
   * Whether a route map is likely (outdoor RUN/BIKE, open-water SWIM).
   * Pool swim / indoor sessions load coach-only until a path actually arrives.
   */
  expectMap?: boolean;
}) {
  const { data, isPending, isError } = useActivityStream(activityId);

  if (isPending) {
    return <ActivityInsightsLoading withCoach={Boolean(coachPanel)} withMap={expectMap} />;
  }

  if (isError) {
    return (
      <ActivityInsightsUnavailable
        coachPanel={coachPanel}
        message="Données détaillées indisponibles pour le moment (pas de trace GPS ni capteurs sur cette séance, ou synchronisation Garmin en cours). Réessaie plus tard."
      />
    );
  }

  if (!data?.available) {
    return (
      <ActivityInsightsUnavailable
        coachPanel={coachPanel}
        message="Pas de données GPS ni de capteurs pour cette séance."
        withIcon
      />
    );
  }

  return (
    <ActivityInsightsContent
      activityId={activityId}
      coachPanel={coachPanel}
      composition={buildActivityInsightsComposition({ activityId, type, coachPanel, data })}
      data={data}
      type={type}
    />
  );
}

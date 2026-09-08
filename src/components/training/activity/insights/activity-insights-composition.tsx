'use client';

import { ActivityType } from '@prisma/client';
import type { ReactNode } from 'react';
import { ExpertOnly } from '@/components/display-mode';
import { MemoizedRouteMap as RouteMap } from '@/components/training/activity/insights/route-map';
import { ActivityInsightsZoneSection } from '@/components/training/activity/insights/activity-insights-zone-section';
import type { ZoneBucket } from '@/lib/activity/detail/activity-analysis';
import { cn } from '@/lib/utils';

/**
 * Evidence stage: coach reading leads; map is the spatial proof beside/below.
 * Mobile: coach first. Desktop: coach left (thesis), map right (evidence).
 */
export function ActivityInsightsComposition({
  activityId,
  type,
  routeColor,
  coachPanel,
  hasPath,
  path,
  hrZones,
  powerZones,
  lthr,
  ftp,
}: {
  activityId: string;
  type: ActivityType;
  routeColor: string;
  coachPanel?: ReactNode;
  hasPath: boolean;
  path: [number, number][] | null | undefined;
  hrZones: ZoneBucket[];
  powerZones: ZoneBucket[];
  lthr: number | null;
  ftp: number | null;
}) {
  if (!hasPath && !coachPanel) {
    return null;
  }

  return (
    <div
      className={cn(
        'activity-log-evidence grid gap-4',
        hasPath &&
          coachPanel &&
          'lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-stretch',
      )}
    >
      {coachPanel ? (
        <div className="order-1 flex min-h-0 flex-col gap-4">
          {coachPanel}
          <ExpertOnly>
            <ActivityInsightsZoneSection
              ftp={ftp}
              hrZones={hrZones}
              lthr={lthr}
              powerZones={powerZones}
              compact
            />
          </ExpertOnly>
        </div>
      ) : null}

      {hasPath && path ? (
        <div className="activity-log-map order-2 h-80 w-full overflow-hidden sm:h-96 lg:min-h-full lg:self-stretch">
          <RouteMap key={`${activityId}-${type}`} lineColor={routeColor} path={path} />
        </div>
      ) : null}
    </div>
  );
}

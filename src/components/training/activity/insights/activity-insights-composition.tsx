'use client';

import { ActivityType } from '@prisma/client';
import type { ReactNode } from 'react';
import { ExpertOnly } from '@/components/display-mode';
import { MemoizedRouteMap as RouteMap } from '@/components/training/activity/insights/route-map';
import { ActivityInsightsZoneSection } from '@/components/training/activity/insights/activity-insights-zone-section';
import type { ZoneBucket } from '@/lib/activity/detail/activity-analysis';
import { cn } from '@/lib/utils';

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
    <div className={cn('grid gap-4', hasPath && coachPanel && 'lg:grid-cols-2 lg:items-stretch')}>
      {coachPanel ? (
        <div className="order-1 flex min-h-0 flex-col gap-4 lg:order-2">
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
        <div className="order-2 h-80 w-full overflow-hidden rounded-xl sm:h-96 lg:order-1 lg:min-h-full">
          <RouteMap key={`${activityId}-${type}`} lineColor={routeColor} path={path} />
        </div>
      ) : null}
    </div>
  );
}

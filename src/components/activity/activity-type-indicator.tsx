'use client';

import { ActivityType } from '@prisma/client';

const ACTIVITY_TYPE_INDICATORS: Record<ActivityType, string> = {
  RUN: 'CO',
  BIKE: 'VE',
  SWIM: 'NA',
  STRENGTH: 'MU',
  TRIATHLON: 'TRI',
  OTHER: 'AUT',
};

export function ActivityTypeIndicator({ type }: { type: ActivityType }) {
  return (
    <span className="bg-analysis-surface text-muted-foreground text-data inline-flex shrink-0 items-center rounded-[4px] px-1 py-px text-[9px] leading-none">
      {ACTIVITY_TYPE_INDICATORS[type]}
    </span>
  );
}

'use client';

import { ActivityType } from '@prisma/client';
import { ACTIVITY_COLOR } from '@/lib/today-dashboard-labels';
import { cn } from '@/lib/utils';

const ACTIVITY_TYPE_INDICATORS: Record<ActivityType, string> = {
  RUN: 'CO',
  BIKE: 'VE',
  SWIM: 'NA',
  STRENGTH: 'MU',
  TRIATHLON: 'TRI',
  OTHER: 'AUT',
};

const DEFAULT_TYPE_COLOR = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

export function ActivityTypeIndicator({ type }: { type: ActivityType }) {
  return (
    <span
      className={cn(
        'text-data inline-flex shrink-0 items-center rounded-[4px] px-1 py-px text-[9px] leading-none font-semibold',
        ACTIVITY_COLOR[type] ?? DEFAULT_TYPE_COLOR,
      )}
    >
      {ACTIVITY_TYPE_INDICATORS[type]}
    </span>
  );
}

'use client';

import { ActivityType } from '@prisma/client';

import { SPORT_IDENTITY_SURFACE } from '@/lib/activity/sport-identity';
import { activityTypeLabels } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Dense calendar / micro chips — keep short. Prefer `label` in lists. */
const ACTIVITY_TYPE_CODES: Record<ActivityType, string> = {
  RUN: 'CO',
  BIKE: 'VE',
  SWIM: 'NA',
  STRENGTH: 'MU',
  TRIATHLON: 'TRI',
  OTHER: 'AUT',
};

/** @deprecated Use SPORT_IDENTITY_SURFACE from `@/lib/activity/sport-identity`. */
export const ACTIVITY_TYPE_SURFACE = SPORT_IDENTITY_SURFACE;

/** @deprecated Prefer SPORT_IDENTITY_SURFACE. */
export const ACTIVITY_TYPE_TEXT = SPORT_IDENTITY_SURFACE;

type ActivityTypeIndicatorProps = {
  type: ActivityType;
  /**
   * `label` — Course / Vélo / … (lists, planning).
   * `code` — CO / VE / … (calendar density only).
   */
  variant?: 'label' | 'code';
};

export function ActivityTypeIndicator({ type, variant = 'label' }: ActivityTypeIndicatorProps) {
  const surface = SPORT_IDENTITY_SURFACE[type];

  if (variant === 'code') {
    return (
      <span
        className={cn(
          'text-data inline-flex shrink-0 items-center rounded-[4px] px-1 py-px text-[9px] leading-none font-bold',
          surface,
        )}
      >
        {ACTIVITY_TYPE_CODES[type]}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'text-data inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5',
        'text-[11px] leading-none font-bold tracking-wide',
        surface,
      )}
    >
      {activityTypeLabels[type]}
    </span>
  );
}

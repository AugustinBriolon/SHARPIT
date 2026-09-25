'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  activityStatusOption,
  getActivityStatusServerSnapshot,
  getActivityStatusSnapshot,
  subscribeActivityStatus,
  type ActivityStatusId,
} from '@/lib/health/activity-status';
import { cn } from '@/lib/utils';

/**
 * Planning chrome chip — surfaces non-active training mode next to travel.
 */
export function ActivityStatusPlanningBanner({ className }: { className?: string }) {
  const status = useSyncExternalStore(
    subscribeActivityStatus,
    getActivityStatusSnapshot,
    getActivityStatusServerSnapshot,
  ) as ActivityStatusId;

  if (status === 'active') {
    return null;
  }

  const option = activityStatusOption(status);

  return (
    <Link
      href="/"
      title={option.planningImpact}
      className={cn(
        'border-border bg-muted/50 text-foreground inline-flex max-w-full shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium',
        'hover:bg-muted transition-colors duration-150 ease-out',
        className,
      )}
    >
      <span className="truncate">Mode · {option.label}</span>
    </Link>
  );
}

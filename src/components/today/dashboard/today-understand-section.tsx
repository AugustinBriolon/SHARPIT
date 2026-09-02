'use client';

import Link from 'next/link';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { ActivityConsistencyPanel } from '@/components/today/dashboard/activity-consistency-panel';
import {
  TodayNutritionCard,
  TodayNutritionCardSkeleton,
} from '@/components/today/dashboard/today-nutrition-card';
import { buildUnderstandLinks } from '@/components/today/dashboard/today-understand-links';
import type { ClientActivity } from '@/lib/query/types';
import { cn } from '@/lib/utils';

type Nav = TodayViewModel['navigationTargets'];

function UnderstandLinks({
  navigationTargets,
  limitingFactorHref,
}: {
  navigationTargets: Nav;
  limitingFactorHref?: string | null;
}) {
  return (
    <nav aria-label="Comprendre — preuves et contextes" className="flex flex-wrap gap-x-4 gap-y-2">
      {buildUnderstandLinks(navigationTargets).map((link) => {
        const isLimiter = Boolean(limitingFactorHref) && link.href === limitingFactorHref;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'text-sm underline-offset-4 hover:underline',
              isLimiter
                ? 'text-signal-caution font-medium'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {link.label}
            {isLimiter ? <span className="sr-only"> — frein du jour</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Tertiary evidence — links, not a competing metric grid above the fold.
 */
export function TodayUnderstandSection({
  navigationTargets,
  limitingFactorHref,
  activities,
  activitiesLoading,
  loading = false,
  className,
}: {
  navigationTargets: Nav;
  limitingFactorHref?: string | null;
  activities: ClientActivity[];
  activitiesLoading: boolean;
  loading?: boolean;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      <div className="space-y-2 px-0.5">
        <h2 className="text-label">Comprendre</h2>
        <UnderstandLinks
          limitingFactorHref={limitingFactorHref}
          navigationTargets={navigationTargets}
        />
      </div>
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <ActivityConsistencyPanel activities={activities} loading={activitiesLoading || loading} />
        {loading ? <TodayNutritionCardSkeleton /> : <TodayNutritionCard />}
      </div>
    </section>
  );
}

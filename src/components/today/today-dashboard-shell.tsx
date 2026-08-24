'use client';

import { todayLoadingShell } from '@/lib/presentation/today-loading-shell';
import { ActivityConsistencyPanel } from './dashboard/activity-consistency-panel';
import { TodayActionRow } from './rich/today-action-row';
import { TodayHeader } from './dashboard/today-header';
import { TodayNutritionCardSkeleton } from './dashboard/today-nutrition-card';
import { TodaySignalStrip } from './dashboard/today-signal-strip';
import { TodayVerdictHero } from './rich/today-verdict-hero';

/** Placeholder day id for prerender-safe loading shell (never used while `loading`). */
const SHELL_PLACEHOLDER_DAY_ID = '0000-00-00';

/**
 * Stable Today chrome for Suspense fallback and cold-start loading.
 *
 * It has to hold every section the loaded page holds, or the page grows under
 * the reader as each one arrives. Regularity and nutrition were added to Today
 * and not to this, so the foot of the page appeared out of nowhere.
 */
export function TodayDashboardShell({ trainingDayId }: { trainingDayId?: string }) {
  const dayId = trainingDayId ?? SHELL_PLACEHOLDER_DAY_ID;
  const content = todayLoadingShell();

  return (
    <div className="mx-auto space-y-6 lg:space-y-8">
      <div className="space-y-2 lg:space-y-4">
        <TodayHeader dayKey={dayId} weather={null} loading />
        <TodayVerdictHero vm={content} loading />
        <TodaySignalStrip metricsRow={content.hero.metricsRow} loading />
      </div>
      <TodayActionRow trainingDayId={dayId} vm={content} loading />
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <ActivityConsistencyPanel activities={[]} loading />
        <TodayNutritionCardSkeleton />
      </div>
    </div>
  );
}

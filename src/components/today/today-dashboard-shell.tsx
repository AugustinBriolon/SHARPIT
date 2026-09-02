'use client';

import { todayLoadingShell } from '@/lib/presentation/today-loading-shell';
import { TodayUnderstandSection } from './dashboard/today-understand-section';
import { TodayActionRow } from './rich/today-action-row';
import { TodayHeader } from './dashboard/today-header';
import { TodayVerdictHero } from './rich/today-verdict-hero';

/** Placeholder day id for prerender-safe loading shell (never used while `loading`). */
const SHELL_PLACEHOLDER_DAY_ID = '0000-00-00';

/**
 * Stable Today chrome for Suspense fallback and cold-start loading.
 *
 * It has to hold every section the loaded page holds, or the page grows under
 * the reader as each one arrives. Daily briefing is not part of Today primary
 * UI (verdict owns the fold); generation/API remain available elsewhere.
 */
export function TodayDashboardShell({ trainingDayId }: { trainingDayId?: string }) {
  const dayId = trainingDayId ?? SHELL_PLACEHOLDER_DAY_ID;
  const content = todayLoadingShell();

  return (
    <div className="mx-auto space-y-6 lg:space-y-8">
      <div className="space-y-2 lg:space-y-4">
        <TodayHeader dayKey={dayId} weather={null} loading />
        <TodayVerdictHero vm={content} loading />
      </div>
      <TodayActionRow trainingDayId={dayId} vm={content} loading />
      <TodayUnderstandSection
        activities={[]}
        limitingFactorHref={null}
        metricsRow={content.hero.metricsRow}
        activitiesLoading
        loading
      />
    </div>
  );
}

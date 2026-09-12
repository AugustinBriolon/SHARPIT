'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { PlanLivingCallout } from '@/components/plan/hub/plan-living-callout';
import { PlanAdaptAppliedPanel } from '@/components/plan/adapt-applied-panel';
import { useTodayJournalHabitBridge } from '@/components/today/rich/use-today-journal-habit-bridge';
import { useTodayRunningHabitExperiment } from '@/components/today/rich/use-today-running-habit-experiment';
import { usePlanHubModel } from '@/hooks/use-plan-hub-model';
import { useAdaptAppliedSettled } from '@/hooks/use-adapt-applied-settled';
import { resolveTodayJournalHabitCallout } from '@/lib/journal/journal-habit-today-bridge';
import { buildPlanLivingCallout } from '@/lib/plan/hub/plan-living-callout';

const PlanAdapter = dynamic(
  () => import('@/components/coach/plan/plan-adapter').then((mod) => mod.PlanAdapter),
  { ssr: false },
);

type PlanWeek = NonNullable<ReturnType<typeof usePlanHubModel>['week']>;

function remainingFromWeek(week: PlanWeek) {
  return week.remaining
    .filter((entry) => entry.planned)
    .map((entry) => ({
      id: entry.planned!.id,
      date: entry.planned!.date,
      intensity: entry.planned!.intensity,
      completed: false,
    }));
}

function usePlanLivingHabitCallout(enabled: boolean) {
  const habitBridgeQuery = useTodayJournalHabitBridge(enabled);
  const runningExperimentQuery = useTodayRunningHabitExperiment(enabled);
  return useMemo(
    () =>
      resolveTodayJournalHabitCallout(
        runningExperimentQuery.data ?? null,
        habitBridgeQuery.data?.bridge ?? null,
      ),
    [habitBridgeQuery.data?.bridge, runningExperimentQuery.data],
  );
}

/**
 * Between destination and week decision — elevates adjust when Twin / habit + #92 align.
 * After apply, shows settled confirmation for the rest of the local day.
 */
export function PlanLivingSlot() {
  const model = usePlanHubModel();
  const [adapterOpen, setAdapterOpen] = useState(false);
  const { adaptAck, settled } = useAdaptAppliedSettled();
  const habitCallout = usePlanLivingHabitCallout(!settled);

  const callout = useMemo(() => {
    if (settled || !model.weekReady || !model.week) {
      return null;
    }
    const remaining = remainingFromWeek(model.week);
    return buildPlanLivingCallout({
      hasDatedGoal: Boolean(model.goal?.targetDate),
      hasActiveMacro: Boolean(model.macroRail),
      hasRemainingSessions: remaining.length > 0,
      goalLabel: model.goal?.title ?? null,
      verdict: model.verdict,
      remaining,
      habitCallout,
      day: model.now ?? undefined,
    });
  }, [
    habitCallout,
    model.goal,
    model.macroRail,
    model.now,
    model.verdict,
    model.week,
    model.weekReady,
    settled,
  ]);

  if (settled && adaptAck) {
    return <PlanAdaptAppliedPanel ack={adaptAck} />;
  }

  if (!callout) {
    return null;
  }

  return (
    <>
      <PlanLivingCallout callout={callout} onAdjust={() => setAdapterOpen(true)} />
      {adapterOpen ? (
        <PlanAdapter initialFocus={callout.focus} onClose={() => setAdapterOpen(false)} />
      ) : null}
    </>
  );
}

'use client';

import { ActivityConsistencyPanel } from './dashboard/activity-consistency-panel';
import { EvolutionChart } from './dashboard/evolution-chart';
import { HealthMonitorPanel } from './dashboard/health-monitor-panel';
import { PlanningRow } from './dashboard/planning-row';
import { DashboardSkeleton, InsufficientDataState } from './dashboard/today-dashboard-states';
import { TodayMetricsRow } from './dashboard/today-metrics-row';
import {
  useTodayDashboardViewModel,
  type AdaptationDecisionVerdict,
} from './dashboard/use-today-dashboard-view-model';
import { NarrativeHeader } from './narrative-header';
import { SessionBlock } from './session-block';

export function TodayDashboard() {
  const vm = useTodayDashboardViewModel();
  const { reasoning, adaptation } = vm;

  if (vm.loading) return <DashboardSkeleton />;
  if (!vm.ready) return <InsufficientDataState onRetry={vm.refresh} />;

  return (
    <div className="space-y-4 lg:space-y-4">
      <TodayMetricsRow vm={vm} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        <NarrativeHeader
          className="lg:col-start-1 lg:row-start-1"
          computedAt={reasoning.computedAt}
          topAction={reasoning.topAction!}
          verdict={reasoning.overallVerdict}
        />

        <SessionBlock
          adaptationVerdict={(adaptation?.decision.verdict as AdaptationDecisionVerdict) ?? null}
          className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
          daySummary={vm.daySummary}
          keyFindings={reasoning.keyFindings}
          recommendation={vm.primaryRecommendation}
          onWellnessCompleted={vm.refresh}
        />

        <ActivityConsistencyPanel
          activities={vm.activities}
          className="lg:col-start-1 lg:row-start-2"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <EvolutionChart entries={vm.healthEntries} sleepTargetMin={vm.sleepTargetMin} />
        <HealthMonitorPanel entries={vm.healthEntries} entry={vm.todayEntry} />
      </div>

      <PlanningRow sessions={vm.plannedSessions} />
    </div>
  );
}

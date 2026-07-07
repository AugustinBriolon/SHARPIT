'use client';

import { ActivityConsistencyPanel } from './dashboard/activity-consistency-panel';
import { EvolutionChart } from './dashboard/evolution-chart';
import { HealthMonitorPanel } from './dashboard/health-monitor-panel';
import { PlanningRow } from './dashboard/planning-row';
import {
  DashboardSkeleton,
  PartialSnapshotFallback,
  SnapshotStatusBanner,
} from './dashboard/today-dashboard-states';
import { TodayMetricsRow } from './dashboard/today-metrics-row';
import { useTodayDashboardViewModel } from './dashboard/use-today-dashboard-view-model';
import { NarrativeHeader } from './narrative-header';
import { SessionBlock } from './session-block';

export function TodayDashboard() {
  const vm = useTodayDashboardViewModel();
  const { reasoning, snapshot } = vm;

  if (vm.loading && !snapshot) return <DashboardSkeleton />;

  if (!vm.hasContent && snapshot) {
    return <PartialSnapshotFallback snapshot={snapshot} onRetry={vm.refresh} />;
  }

  if (!reasoning?.topAction) {
    return (
      <div className="space-y-4">
        {vm.primaryProductMessage ? (
          <SnapshotStatusBanner isRefreshing={vm.isRefreshing} message={vm.primaryProductMessage} />
        ) : null}
        <TodayMetricsRow vm={vm} />
        <PlanningRow sessions={vm.plannedSessions} />
      </div>
    );
  }

  return (
    <div className="space-y-4 lg:space-y-4">
      {vm.primaryProductMessage && !vm.isRefreshing ? (
        <SnapshotStatusBanner message={vm.primaryProductMessage} />
      ) : null}

      <TodayMetricsRow vm={vm} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:gap-4">
        <NarrativeHeader
          activities={vm.activities}
          briefing={vm.briefing?.content}
          briefingGeneratedAt={vm.briefing?.generatedAt}
          className="row-span-2 lg:col-start-1 lg:row-start-1"
          computedAt={reasoning.computedAt}
          daySummary={vm.daySummary}
          topAction={reasoning.topAction}
          verdict={reasoning.overallVerdict}
        />

        <SessionBlock
          className="lg:col-start-2 lg:row-span-1 lg:row-start-1"
          daySummary={vm.daySummary}
          keyFindings={reasoning.keyFindings}
          recommendation={vm.primaryRecommendation}
          onWellnessCompleted={vm.refresh}
        />

        <ActivityConsistencyPanel
          activities={vm.activities}
          className="lg:col-start-2 lg:row-start-2"
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

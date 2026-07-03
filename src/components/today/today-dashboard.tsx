'use client';

import { ConfidencePanel } from './dashboard/confidence-panel';
import { EvolutionChart } from './dashboard/evolution-chart';
import { HealthMonitorPanel } from './dashboard/health-monitor-panel';
import { PlanningRow } from './dashboard/planning-row';
import { DashboardSkeleton, InsufficientDataState } from './dashboard/today-dashboard-states';
import { TodayScoreCardsRow } from './dashboard/today-score-cards-row';
import {
  useTodayDashboardViewModel,
  type AdaptationDecisionVerdict,
  type PhysiologicalConsistency,
} from './dashboard/use-today-dashboard-view-model';
import { NarrativeHeader } from './narrative-header';
import { SessionBlock } from './session-block';

export function TodayDashboard() {
  const vm = useTodayDashboardViewModel();

  if (vm.loading) return <DashboardSkeleton />;
  if (!vm.ready) return <InsufficientDataState onRetry={vm.refresh} />;

  const { reasoning, adaptation } = vm;

  return (
    <div className="space-y-4">
      <TodayScoreCardsRow vm={vm} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-3">
          <NarrativeHeader
            computedAt={reasoning.computedAt}
            confidence={reasoning.confidence}
            topAction={reasoning.topAction!}
            verdict={reasoning.overallVerdict}
          />
          <SessionBlock
            adaptationVerdict={(adaptation?.decision.verdict as AdaptationDecisionVerdict) ?? null}
            daySummary={vm.daySummary}
            keyFindings={reasoning.keyFindings}
            recommendation={vm.primaryRecommendation}
          />
        </div>
        <ConfidencePanel
          availableModelCount={reasoning.signals.availableModelCount}
          computedAt={reasoning.computedAt}
          confidence={reasoning.confidence}
          consistencyScore={reasoning.consistencyScore}
          dataCompleteness={reasoning.dataCompleteness}
          limitingFactor={reasoning.limitingFactor}
          modelDirections={reasoning.signals.modelDirections}
          overallVerdict={reasoning.overallVerdict}
          physiologicalConsistency={reasoning.physiologicalConsistency as PhysiologicalConsistency}
          recoveryDimCount={vm.recoveryDimCount}
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

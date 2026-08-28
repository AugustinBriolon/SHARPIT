'use client';

import dynamic from 'next/dynamic';
import type { ClientGoal } from '@/lib/query/types';
import type { ScenarioComparisonViewModel } from '@/core/presentation/scenario-comparison-view-model';

const PlanGenerator = dynamic(
  () => import('@/components/coach/plan/plan-generator').then((mod) => mod.PlanGenerator),
  { ssr: false },
);
const PlanAdapter = dynamic(
  () => import('@/components/coach/plan/plan-adapter').then((mod) => mod.PlanAdapter),
  { ssr: false },
);
const MacroPlanDialog = dynamic(
  () => import('@/components/planning/macro-plan-dialog').then((mod) => mod.MacroPlanDialog),
  { ssr: false },
);
const WeeklyBrief = dynamic(
  () => import('@/components/coach/weekly-brief').then((mod) => mod.WeeklyBrief),
  { ssr: false },
);
const ScenarioComparisonDialog = dynamic(
  () =>
    import('@/components/planning/scenario/scenario-comparison-dialog').then(
      (mod) => mod.ScenarioComparisonDialog,
    ),
  { ssr: false },
);

export function PlanningCoachOverlays({
  adapterOpen,
  goals,
  generatorOpen,
  macroPlanOpen,
  scenarioComparisonOpen,
  scenarioComparisonLoading,
  scenarioComparisonViewModel,
  anchorTrainingDayId,
  weeklyBriefOpen,
  onCloseAdapter,
  onCloseGenerator,
  onCloseMacroPlan,
  onCloseScenarioComparison,
  onCloseWeeklyBrief,
}: {
  adapterOpen: boolean;
  goals: ClientGoal[];
  generatorOpen: boolean;
  macroPlanOpen: boolean;
  scenarioComparisonOpen: boolean;
  scenarioComparisonLoading: boolean;
  scenarioComparisonViewModel: ScenarioComparisonViewModel | undefined;
  anchorTrainingDayId?: string;
  weeklyBriefOpen: boolean;
  onCloseAdapter: () => void;
  onCloseGenerator: () => void;
  onCloseMacroPlan: () => void;
  onCloseScenarioComparison: () => void;
  onCloseWeeklyBrief: () => void;
}) {
  return (
    <>
      {generatorOpen ? <PlanGenerator onClose={onCloseGenerator} /> : null}
      {adapterOpen ? <PlanAdapter onClose={onCloseAdapter} /> : null}
      {macroPlanOpen ? <MacroPlanDialog goals={goals} onClose={onCloseMacroPlan} /> : null}
      {weeklyBriefOpen ? <WeeklyBrief onClose={onCloseWeeklyBrief} /> : null}
      {scenarioComparisonOpen ? (
        <ScenarioComparisonDialog
          anchorTrainingDayId={anchorTrainingDayId}
          isLoading={scenarioComparisonLoading}
          open={scenarioComparisonOpen}
          viewModel={scenarioComparisonViewModel}
          onClose={onCloseScenarioComparison}
        />
      ) : null}
    </>
  );
}

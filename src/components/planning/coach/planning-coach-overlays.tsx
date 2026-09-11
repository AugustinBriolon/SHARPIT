'use client';

import dynamic from 'next/dynamic';
import type { ScenarioComparisonViewModel } from '@/core/presentation/scenario-comparison-view-model';

const PlanGenerator = dynamic(
  () => import('@/components/coach/plan/plan-generator').then((mod) => mod.PlanGenerator),
  { ssr: false },
);
const PlanAdapter = dynamic(
  () => import('@/components/coach/plan/plan-adapter').then((mod) => mod.PlanAdapter),
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
  adapterFocus,
  generatorOpen,
  scenarioComparisonOpen,
  scenarioComparisonLoading,
  scenarioComparisonViewModel,
  anchorTrainingDayId,
  onCloseAdapter,
  onCloseGenerator,
  onCloseScenarioComparison,
}: {
  adapterOpen: boolean;
  adapterFocus?: string;
  generatorOpen: boolean;
  scenarioComparisonOpen: boolean;
  scenarioComparisonLoading: boolean;
  scenarioComparisonViewModel: ScenarioComparisonViewModel | undefined;
  anchorTrainingDayId?: string;
  onCloseAdapter: () => void;
  onCloseGenerator: () => void;
  onCloseScenarioComparison: () => void;
}) {
  return (
    <>
      {generatorOpen ? <PlanGenerator onClose={onCloseGenerator} /> : null}
      {adapterOpen ? <PlanAdapter initialFocus={adapterFocus} onClose={onCloseAdapter} /> : null}
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

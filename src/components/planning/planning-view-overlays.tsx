'use client';

import { PlanningCoachOverlays } from '@/components/planning/planning-coach-overlays';
import { PlanningPlannedSessionOverlay } from '@/components/planning/planning-planned-session-overlay';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import type { ScenarioComparisonViewModel } from '@/core/presentation/scenario-comparison-view-model';

export function PlanningViewOverlays({
  adapterOpen,
  createDefaultDate,
  editSession,
  goals,
  generatorOpen,
  isCreateDialog,
  isLoading,
  scenarioComparisonOpen,
  scenarioComparisonLoading,
  scenarioComparisonViewModel,
  anchorTrainingDayId,
  showPlannedDialog,
  onCloseAdapter,
  onCloseGenerator,
  onClosePlannedDialog,
  onCloseScenarioComparison,
}: {
  adapterOpen: boolean;
  createDefaultDate: Date;
  editSession: ClientPlannedSession | null;
  goals: ClientGoal[];
  generatorOpen: boolean;
  isCreateDialog: boolean;
  isLoading: boolean;
  scenarioComparisonOpen: boolean;
  scenarioComparisonLoading: boolean;
  scenarioComparisonViewModel: ScenarioComparisonViewModel | undefined;
  anchorTrainingDayId?: string;
  showPlannedDialog: boolean;
  onCloseAdapter: () => void;
  onCloseGenerator: () => void;
  onClosePlannedDialog: () => void;
  onCloseScenarioComparison: () => void;
}) {
  return (
    <>
      <PlanningPlannedSessionOverlay
        createDefaultDate={createDefaultDate}
        editSession={editSession}
        goals={goals}
        isCreateDialog={isCreateDialog}
        isLoading={isLoading}
        showPlannedDialog={showPlannedDialog}
        onClose={onClosePlannedDialog}
      />
      <PlanningCoachOverlays
        adapterOpen={adapterOpen}
        anchorTrainingDayId={anchorTrainingDayId}
        generatorOpen={generatorOpen}
        scenarioComparisonLoading={scenarioComparisonLoading}
        scenarioComparisonOpen={scenarioComparisonOpen}
        scenarioComparisonViewModel={scenarioComparisonViewModel}
        onCloseAdapter={onCloseAdapter}
        onCloseGenerator={onCloseGenerator}
        onCloseScenarioComparison={onCloseScenarioComparison}
      />
    </>
  );
}

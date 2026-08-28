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
  macroPlanOpen,
  scenarioComparisonOpen,
  scenarioComparisonLoading,
  scenarioComparisonViewModel,
  anchorTrainingDayId,
  showPlannedDialog,
  weeklyBriefOpen,
  onCloseAdapter,
  onCloseGenerator,
  onCloseMacroPlan,
  onClosePlannedDialog,
  onCloseScenarioComparison,
  onCloseWeeklyBrief,
}: {
  adapterOpen: boolean;
  createDefaultDate: Date;
  editSession: ClientPlannedSession | null;
  goals: ClientGoal[];
  generatorOpen: boolean;
  isCreateDialog: boolean;
  isLoading: boolean;
  macroPlanOpen: boolean;
  scenarioComparisonOpen: boolean;
  scenarioComparisonLoading: boolean;
  scenarioComparisonViewModel: ScenarioComparisonViewModel | undefined;
  anchorTrainingDayId?: string;
  showPlannedDialog: boolean;
  weeklyBriefOpen: boolean;
  onCloseAdapter: () => void;
  onCloseGenerator: () => void;
  onCloseMacroPlan: () => void;
  onClosePlannedDialog: () => void;
  onCloseScenarioComparison: () => void;
  onCloseWeeklyBrief: () => void;
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
        goals={goals}
        macroPlanOpen={macroPlanOpen}
        scenarioComparisonLoading={scenarioComparisonLoading}
        scenarioComparisonOpen={scenarioComparisonOpen}
        scenarioComparisonViewModel={scenarioComparisonViewModel}
        weeklyBriefOpen={weeklyBriefOpen}
        onCloseAdapter={onCloseAdapter}
        onCloseGenerator={onCloseGenerator}
        onCloseMacroPlan={onCloseMacroPlan}
        onCloseScenarioComparison={onCloseScenarioComparison}
        onCloseWeeklyBrief={onCloseWeeklyBrief}
      />
    </>
  );
}

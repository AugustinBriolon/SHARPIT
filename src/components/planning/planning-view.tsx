'use client';

import { PlanningDaysPanel } from '@/components/planning/planning-days-panel';
import { PlanningPageHeader } from '@/components/planning/planning-page-header';
import { PlanningWeekChrome } from '@/components/planning/planning-week-chrome';
import { PlanningWeekSummary } from '@/components/planning/planning-week-summary';
import { PlanningViewOverlays } from '@/components/planning/planning-view-overlays';
import {
  type PlanningDialogState,
  usePlanningViewData,
} from '@/components/planning/use-planning-view-data';
import type { SessionsCoachAction } from '@/components/coaching/coach-menu';
import { handleSessionsCoachAction } from '@/components/planning/planning-coach-actions';
import { getPlannedDialogPresentation } from '@/components/planning/planning-dialog-presentation';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useResetWhenHidden } from '@/hooks/use-reset-when-hidden';

function usePlanningDialogState(data: ReturnType<typeof usePlanningViewData>) {
  const [dialog, setDialog] = useState<PlanningDialogState>(null);

  function openPlannedSession(session: Parameters<typeof data.openPlannedSession>[0]) {
    data.openPlannedSession(session);
    setDialog({ mode: 'edit', session });
  }

  function closePlannedDialog() {
    setDialog(null);
    data.closePlannedDialogUrlParams();
  }

  const presentation = getPlannedDialogPresentation(
    dialog,
    data.createFromUrl,
    data.deepLinkSession,
  );

  return {
    setDialog,
    openPlannedSession,
    closePlannedDialog,
    ...presentation,
  };
}

export function PlanningView({
  embedded = false,
  showCoachMenu = !embedded,
}: {
  embedded?: boolean;
  showCoachMenu?: boolean;
}) {
  const router = useRouter();
  const data = usePlanningViewData(showCoachMenu);
  const dialogState = usePlanningDialogState(data);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [adapterOpen, setAdapterOpen] = useState(false);
  const [macroPlanOpen, setMacroPlanOpen] = useState(false);
  const [weeklyBriefOpen, setWeeklyBriefOpen] = useState(false);
  const [scenarioComparisonOpen, setScenarioComparisonOpen] = useState(false);

  useResetWhenHidden(() => setScenarioComparisonOpen(false));

  function handleCoachAction(action: SessionsCoachAction) {
    handleSessionsCoachAction(action, {
      router,
      onPlan: () => dialogState.setDialog({ mode: 'create', date: new Date() }),
      onGenerate: () => setGeneratorOpen(true),
      onAdapt: () => setAdapterOpen(true),
      onMacro: () => setMacroPlanOpen(true),
      onWeekBrief: () => setWeeklyBriefOpen(true),
    });
  }

  return (
    <div className="space-y-5">
      {!embedded ? (
        <PlanningPageHeader isLoading={data.isLoading} nextRace={data.nextRace} />
      ) : null}

      <PlanningWeekChrome
        hasActionableAlternative={data.hasActionableAlternative}
        isCurrentWeek={data.isCurrentWeek}
        isLoading={data.isLoading}
        showCoachMenu={showCoachMenu}
        weekEnd={data.weekEnd}
        weekIndex={data.week.index}
        weekStart={data.weekStart}
        onCoachAction={handleCoachAction}
        onCompareScenarios={() => setScenarioComparisonOpen(true)}
        onWeekChange={data.setWeekStart}
      />

      <PlanningWeekSummary
        completed={data.completed}
        loading={data.isLoading}
        plannedLoad={data.week.plannedLoad}
        planWeek={data.planWeek}
        total={data.total}
        weeksToRace={data.week.weeksToRace}
      />

      <PlanningDaysPanel
        data={data}
        onAddDay={(date) => dialogState.setDialog({ mode: 'create', date })}
        onEditSession={dialogState.openPlannedSession}
      />

      <PlanningViewOverlays
        adapterOpen={adapterOpen}
        anchorTrainingDayId={data.anchorTrainingDayId}
        createDefaultDate={dialogState.createDefaultDate}
        editSession={dialogState.editSession}
        generatorOpen={generatorOpen}
        goals={data.goals}
        isCreateDialog={dialogState.isCreateDialog}
        isLoading={data.isLoading}
        macroPlanOpen={macroPlanOpen}
        scenarioComparisonOpen={scenarioComparisonOpen}
        scenarioComparisonViewModel={data.scenarioComparisonQuery.data}
        showPlannedDialog={dialogState.showPlannedDialog}
        weeklyBriefOpen={weeklyBriefOpen}
        scenarioComparisonLoading={
          data.scenarioComparisonQuery.isPending || data.scenarioComparisonQuery.isPlaceholderData
        }
        onCloseAdapter={() => setAdapterOpen(false)}
        onCloseGenerator={() => setGeneratorOpen(false)}
        onCloseMacroPlan={() => setMacroPlanOpen(false)}
        onClosePlannedDialog={dialogState.closePlannedDialog}
        onCloseScenarioComparison={() => setScenarioComparisonOpen(false)}
        onCloseWeeklyBrief={() => setWeeklyBriefOpen(false)}
      />
    </div>
  );
}

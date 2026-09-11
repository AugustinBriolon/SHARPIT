'use client';

import { useResetWhenHidden } from '@/hooks/use-reset-when-hidden';
import { useEffect, useState } from 'react';
import type { SessionsCoachAction } from '@/components/coaching/coach-menu';
import { handleSessionsCoachAction } from '@/components/planning/coach/planning-coach-actions';
import { getPlannedDialogPresentation } from '@/components/planning/overlays/planning-dialog-presentation';
import {
  type PlanningDialogState,
  usePlanningViewData,
} from '@/components/planning/view/use-planning-view-data';
import { PlanningDaysPanel } from '@/components/planning/week/planning-days-panel';
import { PlanningPageHeader } from '@/components/planning/view/planning-page-header';
import { PlanningWeekChrome } from '@/components/planning/week/planning-week-chrome';
import { PlanningWeekSummary } from '@/components/planning/week/planning-week-summary';
import { PlanningViewOverlays } from '@/components/planning/overlays/planning-view-overlays';
import { OfflineSnapshotSummary } from '@/components/pwa/offline-snapshot-summary';
import { usePlanningOffline } from '@/components/planning/view/use-planning-offline';

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

type PlanningViewProps = { embedded?: boolean; showCoachMenu?: boolean };

/**
 * The week, gated on having anything to arrange.
 *
 * The gate is a separate component from the content on purpose: the content's
 * hooks would otherwise still run — and still need a live query client — on the
 * offline path where there is nothing for them to read.
 */
export function PlanningView({ embedded = false, showCoachMenu = !embedded }: PlanningViewProps) {
  const { offlineEntry, showOfflineSnapshot } = usePlanningOffline();

  if (showOfflineSnapshot && offlineEntry) {
    return <OfflineSnapshotSummary entry={offlineEntry} />;
  }

  return <PlanningWeekView embedded={embedded} showCoachMenu={showCoachMenu} />;
}

function PlanningWeekView({ embedded = false, showCoachMenu = !embedded }: PlanningViewProps) {
  const data = usePlanningViewData(showCoachMenu);
  const dialogState = usePlanningDialogState(data);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [adapterOpen, setAdapterOpen] = useState(false);
  const [scenarioComparisonOpen, setScenarioComparisonOpen] = useState(false);

  useResetWhenHidden(() => setScenarioComparisonOpen(false));

  useEffect(() => {
    if (data.adaptFromUrl) {
      setAdapterOpen(true);
    }
  }, [data.adaptFromUrl]);

  function handleCoachAction(action: SessionsCoachAction) {
    handleSessionsCoachAction(action, {
      onGenerate: () => setGeneratorOpen(true),
      onAdapt: () => setAdapterOpen(true),
    });
  }

  function handleCloseAdapter() {
    setAdapterOpen(false);
    data.closeAdaptUrlParams();
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
        adapterFocus={data.adaptFocusFromUrl}
        adapterOpen={adapterOpen}
        anchorTrainingDayId={data.anchorTrainingDayId}
        createDefaultDate={dialogState.createDefaultDate}
        editSession={dialogState.editSession}
        generatorOpen={generatorOpen}
        goals={data.goals}
        isCreateDialog={dialogState.isCreateDialog}
        isLoading={data.isLoading}
        scenarioComparisonOpen={scenarioComparisonOpen}
        scenarioComparisonViewModel={data.scenarioComparisonQuery.data}
        showPlannedDialog={dialogState.showPlannedDialog}
        scenarioComparisonLoading={
          data.scenarioComparisonQuery.isPending || data.scenarioComparisonQuery.isPlaceholderData
        }
        onCloseAdapter={handleCloseAdapter}
        onCloseGenerator={() => setGeneratorOpen(false)}
        onClosePlannedDialog={dialogState.closePlannedDialog}
        onCloseScenarioComparison={() => setScenarioComparisonOpen(false)}
      />
    </div>
  );
}

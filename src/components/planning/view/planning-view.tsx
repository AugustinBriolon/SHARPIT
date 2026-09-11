'use client';

import { useResetWhenHidden } from '@/hooks/use-reset-when-hidden';
import { useEffect, useState } from 'react';
import type { SessionsCoachAction } from '@/components/planning/coach-menu';
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

function useAdaptDeepLinkOpen(adaptFromUrl: boolean, closeAdaptUrlParams: () => void) {
  const [adapterOpen, setAdapterOpen] = useState(false);

  useEffect(() => {
    if (adaptFromUrl) {
      setAdapterOpen(true);
    }
  }, [adaptFromUrl]);

  function handleCloseAdapter() {
    setAdapterOpen(false);
    closeAdaptUrlParams();
  }

  return { adapterOpen, setAdapterOpen, handleCloseAdapter };
}

function useGenerateDeepLinkOpen(generateFromUrl: boolean, closeGenerateUrlParams: () => void) {
  const [generatorOpen, setGeneratorOpen] = useState(false);

  useEffect(() => {
    if (generateFromUrl) {
      setGeneratorOpen(true);
    }
  }, [generateFromUrl]);

  function handleCloseGenerator() {
    setGeneratorOpen(false);
    closeGenerateUrlParams();
  }

  return { generatorOpen, setGeneratorOpen, handleCloseGenerator };
}

function PlanningWeekOverlays({
  data,
  dialogState,
  generatorOpen,
  adapterOpen,
  scenarioComparisonOpen,
  onCloseAdapter,
  onCloseGenerator,
  onCloseScenarioComparison,
}: {
  data: ReturnType<typeof usePlanningViewData>;
  dialogState: ReturnType<typeof usePlanningDialogState>;
  generatorOpen: boolean;
  adapterOpen: boolean;
  scenarioComparisonOpen: boolean;
  onCloseAdapter: () => void;
  onCloseGenerator: () => void;
  onCloseScenarioComparison: () => void;
}) {
  return (
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
      onCloseAdapter={onCloseAdapter}
      onCloseGenerator={onCloseGenerator}
      onClosePlannedDialog={dialogState.closePlannedDialog}
      onCloseScenarioComparison={onCloseScenarioComparison}
    />
  );
}

function usePlanningWeekOverlayState(data: ReturnType<typeof usePlanningViewData>) {
  const [scenarioComparisonOpen, setScenarioComparisonOpen] = useState(false);
  const { generatorOpen, setGeneratorOpen, handleCloseGenerator } = useGenerateDeepLinkOpen(
    data.generateFromUrl,
    data.closeGenerateUrlParams,
  );
  const { adapterOpen, setAdapterOpen, handleCloseAdapter } = useAdaptDeepLinkOpen(
    data.adaptFromUrl,
    data.closeAdaptUrlParams,
  );

  useResetWhenHidden(() => setScenarioComparisonOpen(false));

  function handleCoachAction(action: SessionsCoachAction) {
    handleSessionsCoachAction(action, {
      onGenerate: () => setGeneratorOpen(true),
      onAdapt: () => setAdapterOpen(true),
    });
  }

  return {
    adapterOpen,
    generatorOpen,
    handleCloseAdapter,
    handleCloseGenerator,
    handleCoachAction,
    scenarioComparisonOpen,
    setScenarioComparisonOpen,
  };
}

function PlanningWeekMainPanels({
  data,
  dialogState,
  overlayState,
  showCoachMenu,
}: {
  data: ReturnType<typeof usePlanningViewData>;
  dialogState: ReturnType<typeof usePlanningDialogState>;
  overlayState: ReturnType<typeof usePlanningWeekOverlayState>;
  showCoachMenu: boolean;
}) {
  return (
    <>
      <PlanningWeekChrome
        hasActionableAlternative={data.hasActionableAlternative}
        isCurrentWeek={data.isCurrentWeek}
        isLoading={data.isLoading}
        showCoachMenu={showCoachMenu}
        weekEnd={data.weekEnd}
        weekIndex={data.week.index}
        weekStart={data.weekStart}
        onCoachAction={overlayState.handleCoachAction}
        onCompareScenarios={() => overlayState.setScenarioComparisonOpen(true)}
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
    </>
  );
}

function PlanningWeekLayout({
  data,
  dialogState,
  embedded,
  overlayState,
  showCoachMenu,
}: {
  data: ReturnType<typeof usePlanningViewData>;
  dialogState: ReturnType<typeof usePlanningDialogState>;
  embedded: boolean;
  overlayState: ReturnType<typeof usePlanningWeekOverlayState>;
  showCoachMenu: boolean;
}) {
  return (
    <div className="space-y-5">
      {!embedded ? (
        <PlanningPageHeader isLoading={data.goalsLoading} nextRace={data.nextRace} />
      ) : null}

      <PlanningWeekMainPanels
        data={data}
        dialogState={dialogState}
        overlayState={overlayState}
        showCoachMenu={showCoachMenu}
      />

      <PlanningWeekOverlays
        adapterOpen={overlayState.adapterOpen}
        data={data}
        dialogState={dialogState}
        generatorOpen={overlayState.generatorOpen}
        scenarioComparisonOpen={overlayState.scenarioComparisonOpen}
        onCloseAdapter={overlayState.handleCloseAdapter}
        onCloseGenerator={overlayState.handleCloseGenerator}
        onCloseScenarioComparison={() => overlayState.setScenarioComparisonOpen(false)}
      />
    </div>
  );
}

function PlanningWeekView({ embedded = false, showCoachMenu = !embedded }: PlanningViewProps) {
  const data = usePlanningViewData(showCoachMenu);
  const dialogState = usePlanningDialogState(data);
  const overlayState = usePlanningWeekOverlayState(data);

  return (
    <PlanningWeekLayout
      data={data}
      dialogState={dialogState}
      embedded={embedded}
      overlayState={overlayState}
      showCoachMenu={showCoachMenu}
    />
  );
}

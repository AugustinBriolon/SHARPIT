'use client';

import type { ClientPlannedSession } from '@sharpit/server/lib/query/types';
import { UnlinkedSessionRealization } from '@/components/planning/session/realize/session-realization-parts';
import { LinkedAnalysisSection } from '@/components/planning/session/realize/session-realization-linked-section';
import { useSessionRealizationController } from '@/components/planning/session/realize/use-session-realization-controller';
import type { SessionRealizationAnalysisState } from '@/components/planning/session/realize/use-session-realization-analysis';

export type { SessionRealizationAnalysisState };

/**
 * Linked activity chrome lives in the modal header menu.
 * Body = lecture / gaps / note / pain reassessment only.
 */
export function SessionRealization({
  session,
  analysisState: analysisStateProp,
}: {
  session: ClientPlannedSession;
  /** Parent-owned analysis (realized modal) — skips a second kick. */
  analysisState?: SessionRealizationAnalysisState;
}) {
  const state = useSessionRealizationController(session, analysisStateProp);

  if (!state.isLinked) {
    return (
      <UnlinkedSessionRealization
        candidates={state.candidates}
        isAnalyzing={state.analysisState.isAnalyzing}
        isLinking={state.isLinking}
        pickerOpen={state.picker.pickerOpen}
        session={session}
        showAll={state.picker.showAll}
        onLink={state.handleLink}
        onPickerClose={state.picker.closePicker}
        onPickerOpen={state.picker.openPicker}
        onToggleShowAll={state.picker.toggleShowAll}
      />
    );
  }

  return (
    <LinkedAnalysisSection
      analysis={state.analysisState.analysis}
      analyzedAt={state.analysisState.analyzedAt}
      analyzePending={state.analysisState.analyzePending}
      guardDisabled={state.analysisState.guardDisabled}
      isAnalyzing={state.analysisState.isAnalyzing}
      linked={state.linked}
      painReassessments={state.analysisState.painReassessments}
      pollTimedOut={state.analysisState.pollTimedOut}
      session={session}
      onReanalyze={() => void state.analysisState.handleManualAnalysis()}
    />
  );
}

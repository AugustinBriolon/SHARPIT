import type { PlannedSessionHeaderActions } from '@/components/planning/session/read/planned-session-read-actions-menu';
import type { ClientPlannedSession } from '@sharpit/server/lib/query/types';
import type { SessionRealizationAnalysisState } from '@/components/planning/session/realize/session-realization';

function resolveHeaderActivityId(
  isRealized: boolean,
  session: ClientPlannedSession,
  linkedActivityId?: string | null,
): string | null {
  if (!isRealized) {
    return null;
  }
  return session.activityId ?? linkedActivityId ?? null;
}

function resolveLinkedReanalyzeActions(
  linkedRealized: boolean,
  analysisState: SessionRealizationAnalysisState,
): Pick<
  PlannedSessionHeaderActions,
  'onReanalyze' | 'reanalyzeDisabled' | 'isAnalyzing' | 'hasAnalysis'
> {
  if (!linkedRealized) {
    return {};
  }
  return {
    onReanalyze: () => void analysisState.handleManualAnalysis(),
    reanalyzeDisabled: analysisState.guardDisabled || analysisState.analyzePending,
    isAnalyzing: analysisState.isAnalyzing,
    hasAnalysis: Boolean(analysisState.analysis && analysisState.analyzedAt),
  };
}

export function buildPlannedSessionHeaderActions(input: {
  session: ClientPlannedSession;
  isRealized: boolean;
  isLinked: boolean;
  linkedActivityId?: string | null;
  onEdit: () => void;
  onDelink?: () => void;
  delinkPending: boolean;
  analysisState: SessionRealizationAnalysisState;
}): PlannedSessionHeaderActions {
  const linkedRealized = input.isRealized && input.isLinked;

  return {
    onEdit: input.onEdit,
    sessionId: input.session.id,
    activityId: resolveHeaderActivityId(input.isRealized, input.session, input.linkedActivityId),
    onDelink: linkedRealized ? input.onDelink : undefined,
    delinkPending: input.delinkPending,
    ...resolveLinkedReanalyzeActions(linkedRealized, input.analysisState),
  };
}

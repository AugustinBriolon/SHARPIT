'use client';

import type { ReactNode } from 'react';
import { PlannedSessionDeroulePanel } from '@/components/planning/session/read/planned-session-deroule-panel';
import { PlannedSessionReadSecondaryDetails } from '@/components/planning/session/read/planned-session-read-secondary';
import { buildPlannedSessionHeaderActions } from '@/components/planning/session/read/planned-session-read-header-actions';
import type { PlannedSessionViewModel } from '@sharpit/server/presentation/planned-session-view-model';
import type { ClientGoal, ClientPlannedSession } from '@sharpit/server/lib/query/types';
import type { MorningProposalCompareInput } from '@sharpit/server/lib/today/rich/morning-proposal-compare';
import { usePlannedSessionReadData } from '@/components/planning/session/read/use-planned-session-read-data';
import { useSessionRealizationAnalysis } from '@/components/planning/session/realize/use-session-realization-analysis';
import { useSessionRealizationLinkedActivity } from '@/components/planning/session/realize/use-session-realization-state';
import { usePlannedSessionMutations } from '@/hooks/use-data';

function buildSecondaryDetails(
  context: PlannedSessionViewModel['context'] | null | undefined,
  readData: ReturnType<typeof usePlannedSessionReadData>,
  sessionId: string,
  onEdit: () => void,
) {
  return (
    <PlannedSessionReadSecondaryDetails
      context={context}
      contextSummary={readData.contextSummary}
      hasRationale={readData.hasRationale}
      rationaleOpenByDefault={false}
      sessionId={sessionId}
      showContextPanel={readData.showContextPanel}
      showContextSkeleton={readData.showContextSkeleton}
      onEdit={onEdit}
    />
  );
}

function buildDeroulePanel(
  morningProposal: MorningProposalCompareInput | undefined,
  readData: ReturnType<typeof usePlannedSessionReadData>,
): ReactNode {
  if (morningProposal) {
    return null;
  }
  return (
    <PlannedSessionDeroulePanel
      endurancePreview={readData.endurancePreview}
      freeTextDeroule={readData.freeTextDeroule}
      garminPush={readData.garminPush}
      hasEndurancePlan={readData.hasEndurancePlan}
      hasExerciseMedia={readData.hasExerciseMedia}
      hasStrengthPlan={readData.hasStrengthPlan}
      hasStructuredDeroule={readData.hasStructuredDeroule}
      hero={!readData.isRealized}
      isRealized={readData.isRealized}
      orderedSets={readData.orderedSets}
      prescription={readData.prescription}
      strengthIntent={readData.strengthIntent}
      watchStaleness={readData.watchStaleness}
    />
  );
}

export function usePlannedSessionReadPanels({
  session,
  goals,
  context,
  contextPending,
  onEdit,
  morningProposal,
}: {
  session: ClientPlannedSession;
  goals: ClientGoal[];
  context: PlannedSessionViewModel['context'] | null | undefined;
  contextPending?: boolean;
  onEdit: () => void;
  morningProposal?: MorningProposalCompareInput;
}) {
  const readData = usePlannedSessionReadData({ session, goals, context, contextPending });
  const { link } = usePlannedSessionMutations();
  const { isLinked, linked } = useSessionRealizationLinkedActivity(session);
  const analysisState = useSessionRealizationAnalysis({
    session,
    isLinked: readData.isRealized && isLinked,
  });

  return {
    readData,
    analysisState,
    headerActions: buildPlannedSessionHeaderActions({
      session,
      isRealized: readData.isRealized,
      isLinked,
      linkedActivityId: linked?.id,
      onEdit,
      onDelink: () => link.mutate({ id: session.id, activityId: null }),
      delinkPending: link.isPending,
      analysisState,
    }),
    deroulePanel: buildDeroulePanel(morningProposal, readData),
    secondaryDetails: buildSecondaryDetails(context, readData, session.id, onEdit),
  };
}

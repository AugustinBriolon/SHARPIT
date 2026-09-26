'use client';

import type { ClientPlannedSession } from '@sharpit/server/lib/query/types';
import { usePlannedSessionMutations } from '@/hooks/use-data';
import {
  useSessionRealizationCandidates,
  useSessionRealizationLinkedActivity,
  useSessionRealizationPicker,
} from '@/components/planning/session/realize/use-session-realization-state';
import {
  useSessionRealizationAnalysis,
  type SessionRealizationAnalysisState,
} from '@/components/planning/session/realize/use-session-realization-analysis';

export function useSessionRealizationController(
  session: ClientPlannedSession,
  analysisStateProp?: SessionRealizationAnalysisState,
) {
  const { link } = usePlannedSessionMutations();
  const picker = useSessionRealizationPicker();
  const { isLinked, linked } = useSessionRealizationLinkedActivity(session);
  const candidates = useSessionRealizationCandidates({ session, showAll: picker.showAll });
  const localAnalysis = useSessionRealizationAnalysis({
    session,
    isLinked: analysisStateProp ? false : isLinked,
  });
  const analysisState = analysisStateProp ?? localAnalysis;

  function handleLink(activityId: string) {
    link.mutate({ id: session.id, activityId });
    picker.closePicker();
  }

  return {
    isLinked,
    linked,
    candidates,
    analysisState,
    picker,
    isLinking: link.isPending,
    handleLink,
  };
}

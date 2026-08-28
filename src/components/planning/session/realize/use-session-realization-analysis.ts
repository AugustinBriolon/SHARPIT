'use client';

import { useIsDemoMode } from '@/hooks/use-is-demo-mode';
import { usePlannedSessionMutations } from '@/hooks/use-data';
import { useOfflineGuard } from '@/hooks/use-offline-guard';
import type { ClientPlannedSession } from '@/lib/query/types';
import { toast } from '@/components/ui/toast';
import {
  clearAnalysisPollTimedOut,
  useSessionAnalysisPoll,
} from '@/components/planning/session/realize/use-session-analysis-poll';
import { useSessionAnalysisKick } from '@/components/planning/session/realize/use-session-realization-state';
import { usePainReassessments } from '@/components/planning/session/realize/use-pain-reassessments';

function readAnalysisPollTimedOut(sessionId: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return sessionStorage.getItem(`sharpit.analysis-poll-timeout.${sessionId}`) === '1';
  } catch {
    return false;
  }
}

function computeIsPendingScheduled({
  isDemo,
  isLinked,
  session,
  analyzePending,
}: {
  isDemo: boolean;
  isLinked: boolean;
  session: ClientPlannedSession;
  analyzePending: boolean;
}) {
  const hasAnalysisFromSession = Boolean(session.analyzedAt && session.analysis);
  return Boolean(
    !isDemo &&
    isLinked &&
    !hasAnalysisFromSession &&
    !analyzePending &&
    !readAnalysisPollTimedOut(session.id),
  );
}

export function useSessionRealizationAnalysis({
  session,
  isLinked,
}: {
  session: ClientPlannedSession;
  isLinked: boolean;
}) {
  const { analyze } = usePlannedSessionMutations();
  const isDemo = useIsDemoMode();
  const { guardDisabled } = useOfflineGuard();

  const isPendingScheduled = computeIsPendingScheduled({
    isDemo,
    isLinked,
    session,
    analyzePending: analyze.isPending,
  });

  const pollState = useSessionAnalysisPoll({ session, isPendingScheduled });
  const hasAnalysis = Boolean(pollState.analysis && pollState.analyzedAt);

  useSessionAnalysisKick({
    sessionId: session.id,
    isDemo,
    isLinked,
    hasAnalysis,
    pollTimedOut: pollState.pollTimedOut,
    analyzePending: analyze.isPending,
    analyze,
  });

  const painReassessments = usePainReassessments({ session, analysis: pollState.analysis });
  const isAnalyzing = isDemo ? isLinked && !hasAnalysis : analyze.isPending || isPendingScheduled;

  async function handleManualAnalysis() {
    if (guardDisabled) {
      return;
    }
    clearAnalysisPollTimedOut(session.id);
    pollState.setPollTimedOut(false);
    try {
      sessionStorage.removeItem(`sharpit.analysis-kick.${session.id}`);
    } catch {
      // ignore
    }
    const loadingToast = toast.loading('Analyse de la séance en cours');
    try {
      await analyze.mutateAsync(session.id);
    } finally {
      toast.close(loadingToast);
    }
  }

  return {
    analysis: pollState.analysis,
    analyzedAt: pollState.analyzedAt,
    pollTimedOut: pollState.pollTimedOut,
    painReassessments,
    isAnalyzing,
    analyzePending: analyze.isPending,
    guardDisabled,
    handleManualAnalysis,
  };
}

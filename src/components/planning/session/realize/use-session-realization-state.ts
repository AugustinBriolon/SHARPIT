'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { useActivities } from '@/hooks/use-data';
import { differenceInCalendarDays } from 'date-fns';
import { scorePlannedActivityMatch } from '@/lib/planned-session/linking/session-link-match-score';

export function useSessionRealizationLinkedActivity(session: ClientPlannedSession) {
  const activitiesQuery = useActivities();
  const isLinked = Boolean(session.activityId);

  const linked =
    (session.activity?.type !== null ? session.activity : null) ??
    (session.activityId
      ? (activitiesQuery.data?.find((item) => item.id === session.activityId) ?? null)
      : null);

  return { isLinked, linked };
}

export function useSessionRealizationCandidates({
  session,
  showAll,
}: {
  session: ClientPlannedSession;
  showAll: boolean;
}) {
  const activitiesQuery = useActivities();

  return useMemo(() => {
    const all = activitiesQuery.data ?? [];
    const scored = all
      .filter((a) => differenceInCalendarDays(a.date, session.date) >= 0)
      .map((a) => ({
        a,
        diff: differenceInCalendarDays(a.date, session.date),
        sameType: a.type === session.type,
        score: scorePlannedActivityMatch(
          { date: session.date, durationMin: session.durationMin },
          { date: a.date, duration: a.duration },
        ),
      }))
      .sort((x, y) => {
        if (x.sameType !== y.sameType) {
          return x.sameType ? -1 : 1;
        }
        if (x.score !== y.score) {
          return y.score - x.score;
        }
        return x.diff - y.diff;
      });
    if (showAll) {
      return scored.slice(0, 30);
    }
    return scored.filter((s) => s.sameType && s.diff <= 3).slice(0, 8);
  }, [activitiesQuery.data, session.date, session.durationMin, session.type, showAll]);
}

export function useSessionAnalysisKick({
  sessionId,
  isDemo,
  isLinked,
  hasAnalysis,
  pollTimedOut,
  analyzePending,
  analyze,
}: {
  sessionId: string;
  isDemo: boolean;
  isLinked: boolean;
  hasAnalysis: boolean;
  pollTimedOut: boolean;
  analyzePending: boolean;
  analyze: { mutate: (id: string) => void; isPending: boolean };
}) {
  useEffect(() => {
    if (isDemo || !isLinked || hasAnalysis || pollTimedOut || analyzePending) {
      return;
    }
    const kickKey = `sharpit.analysis-kick.${sessionId}`;
    try {
      if (sessionStorage.getItem(kickKey) === '1') {
        return;
      }
      sessionStorage.setItem(kickKey, '1');
    } catch {
      // still attempt once per mount via analyze below
    }
    analyze.mutate(sessionId);
  }, [analyze, hasAnalysis, isDemo, isLinked, pollTimedOut, analyzePending, sessionId]);
}

export function useSessionRealizationPicker() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  return {
    pickerOpen,
    showAll,
    openPicker: () => setPickerOpen(true),
    closePicker: () => setPickerOpen(false),
    toggleShowAll: () => setShowAll((v) => !v),
  };
}

export type SessionCandidate = {
  a: ClientActivity;
  diff: number;
  sameType: boolean;
};

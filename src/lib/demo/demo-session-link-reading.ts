import type { QueryClient } from '@tanstack/react-query';
import type { ActivityNarrative, SessionAnalysis } from '@/lib/validators/coach';
import { queryKeys } from '@/lib/query/keys';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import {
  readDemoSessionLinks,
  updateDemoSessionLinkReading,
  type DemoSessionLinkReading,
} from '@/lib/demo/demo-session-link-state';
import { plannedSessionSummaryFromClient } from '@/lib/demo/demo-session-link-overlay';

/** Aligns with SessionLinkSuggestionCard demo shimmer duration. */
export const DEMO_SESSION_LINK_READING_DELAY_MS = 1400;

export const DEMO_SESSION_LINK_SESSION_ANALYSIS = {
  complianceScore: 86,
  verdict: 'EASIER',
  summary:
    'Footing récup exécuté comme prévu en durée, avec une charge légèrement inférieure au plan — cohérent avec une séance de récupération.',
  remarks: [
    'Durée réalisée : 40 min — conforme au plan.',
    'Charge mesurée (38 TSS) en dessous du prévu — normal pour un footing récup.',
    'RPE 4 : intensité bien contenue, objectif récupération respecté.',
  ],
  recommendation:
    'Garde cette discipline sur les footings récup : mieux vaut terminer un peu sous le plan que de glisser vers de l’endurance déguisée.',
} satisfies SessionAnalysis;

export const DEMO_SESSION_LINK_ACTIVITY_NARRATIVE = {
  headline: 'Footing récup bien calibré',
  narrative:
    'Allure facile et régulière sur l’ensemble des 40 minutes. La charge reste sous le plan prévu, ce qui est exactement l’intention d’un footing récup après la densité de la semaine. Bon signal : tu as su tenir l’effort bas sans forcer la fin.',
} satisfies ActivityNarrative;

export function buildDemoSessionLinkReading(): DemoSessionLinkReading {
  return {
    analysis: DEMO_SESSION_LINK_SESSION_ANALYSIS,
    narrative: DEMO_SESSION_LINK_ACTIVITY_NARRATIVE,
    analyzedAt: new Date().toISOString(),
  };
}

export function applyDemoSessionLinkReading(
  queryClient: QueryClient,
  plannedSessionId: string,
  activityId: string,
): void {
  const reading = buildDemoSessionLinkReading();
  const analyzedAt = new Date(reading.analyzedAt);

  updateDemoSessionLinkReading(plannedSessionId, reading);

  const sessionsKey = queryKeys.plannedSessions;
  const activitiesKey = queryKeys.activities;

  queryClient.setQueryData<ClientPlannedSession[]>(sessionsKey, (prev) => {
    if (!prev) {
      return prev;
    }
    return prev.map((session) => {
      if (session.id !== plannedSessionId) {
        return session;
      }
      const activityFromCache = queryClient
        .getQueryData<ClientActivity[]>(activitiesKey)
        ?.find((item) => item.id === activityId);
      const activity =
        activityFromCache ??
        session.activity ??
        ({ id: activityId } as NonNullable<ClientPlannedSession['activity']>);
      const withNarrative = {
        ...activity,
        narrativeAnalysis: reading.narrative,
        narrativeAnalyzedAt: analyzedAt,
      } as unknown as NonNullable<ClientPlannedSession['activity']>;
      return {
        ...session,
        activityId,
        activity: withNarrative,
        completed: true,
        analysis: reading.analysis,
        analyzedAt,
      } as ClientPlannedSession;
    });
  });

  queryClient.setQueryData<ClientActivity[]>(activitiesKey, (prev) => {
    if (!prev) {
      return prev;
    }
    const sessions = queryClient.getQueryData<ClientPlannedSession[]>(sessionsKey);
    const linkedSession = sessions?.find((item) => item.id === plannedSessionId);
    return prev.map((activity) => {
      if (activity.id !== activityId) {
        return activity;
      }
      return {
        ...activity,
        narrativeAnalysis: reading.narrative,
        narrativeAnalyzedAt: analyzedAt,
        plannedSession: linkedSession
          ? plannedSessionSummaryFromClient({
              ...linkedSession,
              analysis: reading.analysis,
              analyzedAt,
            })
          : activity.plannedSession,
      } as ClientActivity;
    });
  });
}

const pendingTimers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleDemoSessionLinkReading(
  queryClient: QueryClient,
  plannedSessionId: string,
  activityId: string,
  delayMs = DEMO_SESSION_LINK_READING_DELAY_MS,
): void {
  const key = `${plannedSessionId}:${activityId}`;
  const existing = pendingTimers.get(key);
  if (existing) {
    clearTimeout(existing);
  }

  const timer = setTimeout(() => {
    pendingTimers.delete(key);
    applyDemoSessionLinkReading(queryClient, plannedSessionId, activityId);
  }, delayMs);
  pendingTimers.set(key, timer);
}

export function cancelDemoSessionLinkReadingSchedule(
  plannedSessionId: string,
  activityId: string,
): void {
  const key = `${plannedSessionId}:${activityId}`;
  const existing = pendingTimers.get(key);
  if (existing) {
    clearTimeout(existing);
    pendingTimers.delete(key);
  }
}

export function readDemoSessionLinkReadingForActivity(
  activityId: string,
): DemoSessionLinkReading | null {
  const entry = readDemoSessionLinks().find((link) => link.activityId === activityId);
  return entry?.reading ?? null;
}

export function readDemoSessionLinkReadingForPlannedSession(
  plannedSessionId: string,
): DemoSessionLinkReading | null {
  const entry = readDemoSessionLinks().find((link) => link.plannedSessionId === plannedSessionId);
  return entry?.reading ?? null;
}

import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';

export type PlannedSessionLinkVars = {
  id: string;
  activityId: string | null;
};

/** Instant cache patch for link / unlink — must clear nested `activity` + analysis on unlink. */
export function applyPlannedSessionLinkOptimistic(
  sessions: ClientPlannedSession[],
  { id, activityId }: PlannedSessionLinkVars,
  activities: ClientActivity[] | undefined,
): ClientPlannedSession[] {
  return sessions.map((session) => {
    if (session.id !== id) return session;

    if (activityId == null) {
      return {
        ...session,
        activityId: null,
        activity: null,
        completed: false,
        analysis: null,
        analyzedAt: null,
        updatedAt: new Date(),
      } as ClientPlannedSession;
    }

    const activity =
      activities?.find((item) => item.id === activityId) ??
      (session.activity?.id === activityId ? session.activity : null);

    return {
      ...session,
      activityId,
      activity: activity as ClientPlannedSession['activity'],
      completed: true,
      updatedAt: new Date(),
    } as ClientPlannedSession;
  });
}

/** Keep activity.plannedSession in sync with link / unlink (list + detail chips). */
export function applyActivityPlannedSessionLinkOptimistic(
  activities: ClientActivity[],
  sessions: ClientPlannedSession[] | undefined,
  { id, activityId }: PlannedSessionLinkVars,
  previousActivityId: string | null,
): ClientActivity[] {
  const linkedSession = sessions?.find((session) => session.id === id);

  return activities.map((activity) => {
    if (
      previousActivityId &&
      activity.id === previousActivityId &&
      previousActivityId !== activityId
    ) {
      return { ...activity, plannedSession: null } as ClientActivity;
    }

    if (activityId && activity.id === activityId && linkedSession) {
      return {
        ...activity,
        plannedSession: {
          id: linkedSession.id,
          title: linkedSession.title,
          date: linkedSession.date,
          type: linkedSession.type,
          durationMin: linkedSession.durationMin,
          description: linkedSession.description,
          intensity: linkedSession.intensity,
          analysis: linkedSession.analysis,
          analyzedAt: linkedSession.analyzedAt,
        },
      } as ClientActivity;
    }

    return activity;
  });
}

export function resolvePreviousLinkedActivityId(
  session: ClientPlannedSession | undefined,
): string | null {
  return session?.activityId ?? session?.activity?.id ?? null;
}

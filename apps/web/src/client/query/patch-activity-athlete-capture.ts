import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/client/query/keys';
import type { ClientActivity, ClientPlannedSession } from '@sharpit/server/lib/query/types';

/** Athlete-editable fields that live on the activity, not the planned session. */
export type ActivityAthleteCapturePatch = {
  feeling?: string | null;
  rpe?: number | null;
  notes?: string | null;
};

function applyCapturePatch<T extends ActivityAthleteCapturePatch>(
  target: T,
  patch: ActivityAthleteCapturePatch,
): T {
  return {
    ...target,
    ...(patch.feeling !== undefined ? { feeling: patch.feeling } : {}),
    ...(patch.rpe !== undefined ? { rpe: patch.rpe } : {}),
    ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
  };
}

function sessionMatchesActivity(session: ClientPlannedSession, activityId: string): boolean {
  return session.activityId === activityId || session.activity?.id === activityId;
}

function normalizeNestedActivity(
  nested: ClientPlannedSession['activity'] | null | undefined,
): ClientPlannedSession['activity'] | null {
  return nested && nested.type !== null ? nested : null;
}

function findActivityInList(
  activities: ClientActivity[] | undefined,
  activityId: string | null | undefined,
): ClientActivity | undefined {
  if (!activityId) {
    return undefined;
  }
  return activities?.find((item) => item.id === activityId);
}

function mergeNestedWithListActivity(
  nested: NonNullable<ClientPlannedSession['activity']>,
  fromList: ClientActivity,
): ClientActivity {
  return {
    ...(nested as ClientActivity),
    feeling: fromList.feeling,
    rpe: fromList.rpe,
    notes: fromList.notes,
    title: fromList.title ?? nested.title,
    updatedAt: fromList.updatedAt,
  };
}

/**
 * Keep nested planned-session.activity in sync when ressenti / note is saved.
 * Modal "Séance réalisée" reads session.activity from plannedSessions — without
 * this, FeelingHero stays stale after the activities-list optimistic update.
 */
export function patchActivityAthleteCaptureInPlannedSessions(
  queryClient: QueryClient,
  activityId: string,
  patch: ActivityAthleteCapturePatch,
): void {
  queryClient.setQueryData<ClientPlannedSession[]>(queryKeys.plannedSessions, (prev) => {
    if (!prev) {
      return prev;
    }
    return prev.map((session) => {
      if (!sessionMatchesActivity(session, activityId) || !session.activity) {
        return session;
      }
      return {
        ...session,
        activity: applyCapturePatch(session.activity, patch),
      } as ClientPlannedSession;
    });
  });
}

/**
 * Prefer live activities-list scalars over nested planned-session.activity.
 * Nested keeps narrative / analysis join; list keeps Instant UX after PATCH.
 */
export function resolveLinkedActivity(input: {
  nested: ClientPlannedSession['activity'] | null | undefined;
  activityId: string | null | undefined;
  activities: ClientActivity[] | undefined;
}): ClientActivity | null {
  const nested = normalizeNestedActivity(input.nested);
  const fromList = findActivityInList(input.activities, input.activityId);

  if (nested && fromList) {
    return mergeNestedWithListActivity(nested, fromList);
  }

  return fromList ?? (nested as ClientActivity | null);
}

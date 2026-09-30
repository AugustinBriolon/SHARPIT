import type { ClientActivity, ClientPlannedSession } from '@sharpit/app/lib/query/types';

/**
 * Bricks already under way today, as Today shows them once done: one brick, each leg beside the
 * activity that realized it. Listed activity by activity, a brick lost its shape the moment it
 * was done, and the transition between legs, which a brick trains, was nowhere.
 */

export type BrickLegWithActivity = {
  session: ClientPlannedSession;
  activity: ClientActivity | null;
};

export type DoneBrick = {
  brickGroupId: string;
  legs: BrickLegWithActivity[];
  /** The first realized leg's start: where the brick sits among the day's sessions. */
  startedAt: Date;
};

function brickGroupOf(activity: ClientActivity): string | null {
  return activity.plannedSession?.brickGroupId ?? null;
}

function activityForLeg(
  session: ClientPlannedSession,
  activities: readonly ClientActivity[],
): ClientActivity | null {
  return (
    activities.find((a) => a.plannedSession?.id === session.id) ??
    activities.find((a) => a.id === session.activityId) ??
    null
  );
}

/** The brick's legs in order, from the planned sessions, else from what the activities know. */
function legsOfBrick(
  brickGroupId: string,
  activities: readonly ClientActivity[],
  plannedSessions: readonly ClientPlannedSession[],
): ClientPlannedSession[] {
  const planned = plannedSessions.filter((p) => p.brickGroupId === brickGroupId);
  const fromActivities = activities
    .filter(
      (a) =>
        brickGroupOf(a) === brickGroupId && !planned.some((p) => p.id === a.plannedSession?.id),
    )
    .map(
      (a) =>
        ({
          ...a.plannedSession!,
          activityId: a.id,
          completed: true,
        }) as unknown as ClientPlannedSession,
    );
  return [...planned, ...fromActivities].sort((a, b) => (a.brickOrder ?? 0) - (b.brickOrder ?? 0));
}

/** Bricks with at least one leg realized among `todayActivities`, in the day's order. */
export function collectDoneBricks(
  todayActivities: readonly ClientActivity[],
  plannedSessions: readonly ClientPlannedSession[],
): DoneBrick[] {
  const groupIds = [
    ...new Set(todayActivities.map(brickGroupOf).filter((id): id is string => Boolean(id))),
  ];
  return groupIds
    .map((brickGroupId) => {
      const legs = legsOfBrick(brickGroupId, todayActivities, plannedSessions).map((session) => ({
        session,
        activity: activityForLeg(session, todayActivities),
      }));
      const starts = legs.flatMap((leg) =>
        leg.activity ? [new Date(leg.activity.date).getTime()] : [],
      );
      return { brickGroupId, legs, startedAt: new Date(Math.min(...starts)) };
    })
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
}

/**
 * Seconds between one leg's end and the next one's start (T2, …), null where either leg is not
 * done or has no duration. A slight overlap between watch files reads as 0.
 */
export function brickTransitionsSec(legs: readonly BrickLegWithActivity[]): Array<number | null> {
  return legs.slice(1).map((leg, index) => {
    const previous = legs[index]!.activity;
    const next = leg.activity;
    if (!previous || !next || previous.duration === null || previous.duration === undefined) {
      return null;
    }
    const previousEnd = new Date(previous.date).getTime() + previous.duration * 1000;
    return Math.max(0, Math.round((new Date(next.date).getTime() - previousEnd) / 1000));
  });
}

/** « 2 min 04 », « 45 s »: how long a transition took. */
export function formatTransition(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} s`;
  }
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${String(seconds % 60).padStart(2, '0')}`;
}

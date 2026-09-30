import type { ActivityType, SessionIntensity } from '@prisma/client';
import type { ClientPlannedSession } from '@sharpit/app/lib/query/types';
import { activityTypeLabels } from '@sharpit/app/lib/format';
import { shouldDemoteBrick } from '@sharpit/app/lib/planned-session/brick/brick-demotion';

export type DayPlannedItem =
  | { kind: 'single'; session: ClientPlannedSession }
  | { kind: 'brick'; id: string; sessions: ClientPlannedSession[] };

/** What a realized leg actually was, from its activity: the athlete's own notes included. */
export type BrickLegActual = {
  durationSec: number | null;
  load: number | null;
  rpe: number | null;
  feeling: string | null;
};

/** One leg of a brick, reduced to what an overview card needs to render it. */
export type BrickLegSummary = {
  id: string;
  type: ActivityType;
  title: string;
  durationMin: number | null;
  intensity: SessionIntensity | null;
  completed: boolean;
  activityId: string | null;
  /** Set once the leg is done and its activity is at hand; null while it is only planned. */
  actual?: BrickLegActual | null;
};

type BrickLegActivity = {
  id: string;
  duration: number | null;
  load: number | null;
  rpe: number | null;
  feeling: string | null;
};

/** Sibling realized activity in the same brick (not the current one). */
export type BrickSiblingActivityLink = {
  activityId: string;
  type: ActivityType;
  title: string;
  brickOrder: number;
};

/**
 * The legs as a card lists them. With `activityFor`, a leg whose activity is known reads as done
 * and carries what it actually was.
 */
export function brickLegSummaries(
  sessions: readonly ClientPlannedSession[],
  activityFor?: (session: ClientPlannedSession) => BrickLegActivity | null,
): BrickLegSummary[] {
  return sessions.map((s) => {
    const activity = activityFor?.(s) ?? null;
    return {
      id: s.id,
      type: s.type,
      title: s.title?.trim() || activityTypeLabels[s.type],
      durationMin: s.durationMin,
      intensity: s.intensity,
      completed: Boolean(activity) || Boolean(s.completed && s.activityId),
      activityId: activity?.id ?? s.activityId,
      ...(activityFor
        ? {
            actual: activity
              ? {
                  durationSec: activity.duration,
                  load: activity.load,
                  rpe: activity.rpe,
                  feeling: activity.feeling,
                }
              : null,
          }
        : {}),
    };
  });
}

/**
 * Other realized legs in the same brick, ordered by brickOrder.
 * Uses planned-session links already stored (brickGroupId + activityId) — no new schema.
 */
export function resolveBrickSiblingActivityLinks(
  legs: readonly Pick<
    ClientPlannedSession,
    'id' | 'type' | 'title' | 'brickOrder' | 'activityId' | 'completed'
  >[],
  currentActivityId: string,
): BrickSiblingActivityLink[] {
  return legs
    .filter((leg) => leg.activityId && leg.activityId !== currentActivityId)
    .map((leg) => ({
      activityId: leg.activityId!,
      type: leg.type,
      title: leg.title?.trim() || activityTypeLabels[leg.type],
      brickOrder: leg.brickOrder ?? 0,
    }))
    .sort((a, b) => a.brickOrder - b.brickOrder);
}

/** Regroupe les jambes d'un même brick, en conservant l'ordre d'apparition. */
export function groupPlannedSessions(planned: ClientPlannedSession[]): DayPlannedItem[] {
  const result: DayPlannedItem[] = [];
  const bricks = new Map<string, Extract<DayPlannedItem, { kind: 'brick' }>>();

  for (const p of planned) {
    if (p.brickGroupId) {
      let entry = bricks.get(p.brickGroupId);
      if (!entry) {
        entry = { kind: 'brick', id: p.brickGroupId, sessions: [] };
        bricks.set(p.brickGroupId, entry);
        result.push(entry);
      }
      entry.sessions.push(p);
    } else {
      result.push({ kind: 'single', session: p });
    }
  }

  for (const entry of bricks.values()) {
    entry.sessions.sort((a, b) => (a.brickOrder ?? 0) - (b.brickOrder ?? 0));
  }

  // Product lock: one remaining leg is a simple session, never a brick tag.
  return result.flatMap((item) => {
    if (item.kind !== 'brick' || !shouldDemoteBrick(item.sessions.length)) {
      return [item];
    }
    return item.sessions.map((session) => ({ kind: 'single' as const, session }));
  });
}

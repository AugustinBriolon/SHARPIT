import type { ActivityType, SessionIntensity } from '@prisma/client';
import type { ClientPlannedSession } from '@/lib/query/types';
import { activityTypeLabels } from '@/lib/format';

export type DayPlannedItem =
  | { kind: 'single'; session: ClientPlannedSession }
  | { kind: 'brick'; id: string; sessions: ClientPlannedSession[] };

/** One leg of a brick, reduced to what an overview card needs to render it. */
export type BrickLegSummary = {
  id: string;
  type: ActivityType;
  title: string;
  durationMin: number | null;
  intensity: SessionIntensity | null;
  completed: boolean;
  activityId: string | null;
};

export function brickLegSummaries(sessions: readonly ClientPlannedSession[]): BrickLegSummary[] {
  return sessions.map((s) => ({
    id: s.id,
    type: s.type,
    title: s.title?.trim() || activityTypeLabels[s.type],
    durationMin: s.durationMin,
    intensity: s.intensity,
    completed: Boolean(s.completed && s.activityId),
    activityId: s.activityId,
  }));
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
  return result;
}

import type { ClientPlannedSession } from '@/lib/query/types';

export type DayPlannedItem =
  | { kind: 'single'; session: ClientPlannedSession }
  | { kind: 'brick'; id: string; sessions: ClientPlannedSession[] };

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

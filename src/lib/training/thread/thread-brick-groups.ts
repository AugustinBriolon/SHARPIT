import type { ThreadEntry } from './thread-model';

export type ThreadDayItem =
  | { kind: 'single'; entry: ThreadEntry }
  | { kind: 'brick'; id: string; entries: ThreadEntry[] };

/**
 * Groups a day's thread entries by brick, so an enchaînement's legs render as one
 * unit instead of as unrelated rows — whether or not a leg has already been
 * realized and linked to its activity.
 */
export function groupThreadDayEntries(entries: readonly ThreadEntry[]): ThreadDayItem[] {
  const result: ThreadDayItem[] = [];
  const bricks = new Map<string, Extract<ThreadDayItem, { kind: 'brick' }>>();

  for (const entry of entries) {
    const brickGroupId = entry.planned?.brickGroupId;
    if (brickGroupId) {
      let group = bricks.get(brickGroupId);
      if (!group) {
        group = { kind: 'brick', id: brickGroupId, entries: [] };
        bricks.set(brickGroupId, group);
        result.push(group);
      }
      group.entries.push(entry);
    } else {
      result.push({ kind: 'single', entry });
    }
  }

  for (const group of bricks.values()) {
    group.entries.sort((a, b) => (a.planned?.brickOrder ?? 0) - (b.planned?.brickOrder ?? 0));
  }

  return result;
}

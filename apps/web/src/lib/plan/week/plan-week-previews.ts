import { ActivityType } from '@prisma/client';
import { isDemoSessionLinkPlannedTitle } from '@/lib/demo/demo-session-link-markers';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';

/** Four map cards is a rail. A week of six is still a gallery. */
export const HUB_DONE_PREVIEW_LIMIT = 4;

/** Two remaining sessions locate the week. The rest belong on /plan/semaine. */
export const HUB_REMAINING_PREVIEW_LIMIT = 2;

/**
 * The hub shows the latest realized sessions, newest first.
 *
 * Older ones stay as a count that routes to Activité: the hub summarises, it
 * does not become a second history.
 */
export function selectHubDoneEntries(done: readonly ThreadEntry[]): {
  featured: ThreadEntry[];
  overflow: number;
} {
  const withActivity = done.filter((entry) => entry.activity);
  if (withActivity.length <= HUB_DONE_PREVIEW_LIMIT) {
    return { featured: [...withActivity].reverse(), overflow: 0 };
  }
  return {
    featured: withActivity.slice(-HUB_DONE_PREVIEW_LIMIT).reverse(),
    overflow: withActivity.length - HUB_DONE_PREVIEW_LIMIT,
  };
}

/** Consecutive same-day sessions share one date, then sit side by side. */
export function groupHubDoneByDay(
  featured: readonly ThreadEntry[],
): { dayKey: string; entries: ThreadEntry[] }[] {
  const groups: { dayKey: string; entries: ThreadEntry[] }[] = [];
  for (const entry of featured) {
    const last = groups.at(-1);
    if (last && last.dayKey === entry.dayKey) {
      last.entries.push(entry);
      continue;
    }
    groups.push({ dayKey: entry.dayKey, entries: [entry] });
  }
  return groups;
}

export function hubDoneCardAccessibleName(dayLabel: string, title: string): string {
  return `${dayLabel} · ${title}`;
}

/** Warm GPS streams for the cards the hub will actually mount. */
export function selectPlanHubStreamPrefetchIds(
  activities: readonly { id: string; type: ActivityType; date: Date | string }[],
): string[] {
  return [...activities]
    .filter((activity) => activity.type !== ActivityType.STRENGTH)
    .sort((left, right) => +new Date(right.date) - +new Date(left.date))
    .slice(0, HUB_DONE_PREVIEW_LIMIT)
    .map((activity) => activity.id);
}

/**
 * When the week decision owns one planned session, drop it from « À faire ».
 * If that session is a brick leg, drop every leg of the same brick — otherwise
 * the hub shows a broken one-leg brick under the featured decision card.
 */
export function resolveExcludedPlannedIds(
  remaining: readonly ThreadEntry[],
  excludePlannedId?: string | null,
): Set<string> {
  if (!excludePlannedId) {
    return new Set();
  }
  const seed = remaining.find((entry) => entry.planned?.id === excludePlannedId);
  const brickId = seed?.planned?.brickGroupId ?? null;
  if (!brickId) {
    return new Set([excludePlannedId]);
  }
  return new Set(
    remaining
      .filter((entry) => entry.planned?.brickGroupId === brickId)
      .map((entry) => entry.planned!.id),
  );
}

export function selectHubRemainingEntries(
  remaining: readonly ThreadEntry[],
  excludePlannedId?: string | null,
): {
  featured: ThreadEntry[];
  overflow: number;
} {
  const excluded = resolveExcludedPlannedIds(remaining, excludePlannedId);
  const owed = remaining.filter(
    (entry) =>
      entry.planned &&
      !excluded.has(entry.planned.id) &&
      !isDemoSessionLinkPlannedTitle(entry.planned.title),
  );
  const units: ThreadEntry[][] = [];
  const seenBricks = new Set<string>();

  for (const entry of owed) {
    const brickId = entry.planned?.brickGroupId ?? null;
    if (!brickId) {
      units.push([entry]);
      continue;
    }
    if (seenBricks.has(brickId)) {
      continue;
    }
    seenBricks.add(brickId);
    units.push(
      owed
        .filter((candidate) => candidate.planned?.brickGroupId === brickId)
        .sort((a, b) => (a.planned?.brickOrder ?? 0) - (b.planned?.brickOrder ?? 0)),
    );
  }

  if (units.length <= HUB_REMAINING_PREVIEW_LIMIT) {
    return { featured: units.flat(), overflow: 0 };
  }

  const featuredUnits = units.slice(0, HUB_REMAINING_PREVIEW_LIMIT);
  return {
    featured: featuredUnits.flat(),
    overflow: units.length - featuredUnits.length,
  };
}

export type HubRemainingItem =
  { kind: 'single'; entry: ThreadEntry } | { kind: 'brick'; id: string; entries: ThreadEntry[] };

/**
 * What « Prochaine séance » should open — a single card or the full brick block.
 */
export function resolveDecisionSessionBlock(
  remaining: readonly ThreadEntry[],
  sessionId: string | null,
): HubRemainingItem | null {
  if (!sessionId) {
    return null;
  }
  const entry = remaining.find((candidate) => candidate.planned?.id === sessionId) ?? null;
  if (!entry?.planned) {
    return null;
  }
  const brickId = entry.planned.brickGroupId ?? null;
  if (!brickId) {
    return { kind: 'single', entry };
  }
  const entries = remaining
    .filter((candidate) => candidate.planned?.brickGroupId === brickId)
    .sort((a, b) => (a.planned?.brickOrder ?? 0) - (b.planned?.brickOrder ?? 0));
  return { kind: 'brick', id: brickId, entries };
}

/** Display grouping for hub remaining — one brick card per brickGroupId. */
export function groupHubRemainingItems(featured: readonly ThreadEntry[]): HubRemainingItem[] {
  const result: HubRemainingItem[] = [];
  const bricks = new Map<string, Extract<HubRemainingItem, { kind: 'brick' }>>();

  for (const entry of featured) {
    const brickId = entry.planned?.brickGroupId ?? null;
    if (!brickId) {
      result.push({ kind: 'single', entry });
      continue;
    }
    let group = bricks.get(brickId);
    if (!group) {
      group = { kind: 'brick', id: brickId, entries: [] };
      bricks.set(brickId, group);
      result.push(group);
    }
    group.entries.push(entry);
  }

  for (const group of bricks.values()) {
    group.entries.sort((a, b) => (a.planned?.brickOrder ?? 0) - (b.planned?.brickOrder ?? 0));
  }
  return result;
}

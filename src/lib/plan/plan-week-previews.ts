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

export function selectHubRemainingEntries(
  remaining: readonly ThreadEntry[],
  excludePlannedId?: string | null,
): {
  featured: ThreadEntry[];
  overflow: number;
} {
  const owed = remaining.filter((entry) => entry.planned && entry.planned.id !== excludePlannedId);
  if (owed.length <= HUB_REMAINING_PREVIEW_LIMIT) {
    return { featured: [...owed], overflow: 0 };
  }
  return {
    featured: owed.slice(0, HUB_REMAINING_PREVIEW_LIMIT),
    overflow: owed.length - HUB_REMAINING_PREVIEW_LIMIT,
  };
}

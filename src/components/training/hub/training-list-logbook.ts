import { format, isSameWeek, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { ClientActivity } from '@/lib/query/types';

export type ActivityWeekGroup = {
  key: string;
  label: string;
  activities: ClientActivity[];
};

/** Group activities into ISO weeks (most recent first), each with a human label. */
export function groupActivitiesByWeek(activities: ClientActivity[]): ActivityWeekGroup[] {
  const today = new Date();
  const groups = new Map<string, ActivityWeekGroup>();

  for (const activity of activities) {
    const date = new Date(activity.date);
    const weekStart = startOfWeek(date, { locale: fr });
    const key = format(weekStart, 'yyyy-MM-dd');
    let group = groups.get(key);
    if (!group) {
      const label = isSameWeek(date, today, { locale: fr })
        ? 'Cette semaine'
        : `Semaine du ${format(weekStart, 'd MMMM', { locale: fr })}`;
      group = { key, label, activities: [] };
      groups.set(key, group);
    }
    group.activities.push(activity);
  }

  return [...groups.values()]
    .sort((a, b) => b.key.localeCompare(a.key))
    .map((group) => ({
      ...group,
      activities: [...group.activities].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    }));
}

export function formatWeekSessionCount(count: number): string {
  return count === 1 ? '1 séance' : `${count} séances`;
}

export type ActivityHistoryVirtualRow =
  | { kind: 'week'; key: string; label: string; count: number }
  | { kind: 'activity'; key: string; activity: ClientActivity };

/** Flatten week groups into a single virtualizer-friendly row list. */
export function flattenActivityWeekGroups(
  weekGroups: ActivityWeekGroup[],
): ActivityHistoryVirtualRow[] {
  const rows: ActivityHistoryVirtualRow[] = [];
  for (const group of weekGroups) {
    rows.push({
      kind: 'week',
      key: `week-${group.key}`,
      label: group.label,
      count: group.activities.length,
    });
    for (const activity of group.activities) {
      rows.push({ kind: 'activity', key: activity.id, activity });
    }
  }
  return rows;
}

/** Estimated row heights for the history virtualizer (px). */
export function estimateActivityHistoryRowSize(row: ActivityHistoryVirtualRow): number {
  if (row.kind === 'week') {
    return 44;
  }
  // CompletedSessionPreview column layout — map + KPIs; measured precisely at runtime.
  return 220;
}

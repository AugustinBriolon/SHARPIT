import { startOfWeek } from 'date-fns';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { activityTypeLabels } from '@/lib/format';
import { dayKeyFromDate } from '@/lib/date/day-key';
import type { ThreadDay, ThreadEntry, ThreadWeek } from './thread-model';

/**
 * Builds the thread: one chronological list where prescribed and performed sit
 * together, anchored on a pivot day.
 *
 * Pure. Given the same two lists and the same pivot it returns the same weeks, so
 * the scrubber, the ruler and the timeline are all reading one arrangement rather
 * than three that drift apart.
 */

/** Local calendar day, so a session at 23:00 does not land on tomorrow. */
function localDayKey(date: Date | string): string {
  const d = new Date(date);
  return dayKeyFromDate(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
}

function weekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

function isoWeekKey(date: Date): string {
  const start = weekStart(date);
  // Thursday of the same week decides the ISO year.
  const thursday = new Date(start);
  thursday.setDate(start.getDate() + 3);
  const jan4 = new Date(thursday.getFullYear(), 0, 4);
  const week =
    1 + Math.round((weekStart(thursday).getTime() - weekStart(jan4).getTime()) / 604_800_000);
  return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function weekLabel(weekKey: string): string {
  return `S${weekKey.slice(-2)}`;
}

function activityTitle(activity: ClientActivity): string {
  return activity.title?.trim() || activityTypeLabels[activity.type];
}

function plannedTitle(session: ClientPlannedSession): string {
  return session.title?.trim() || activityTypeLabels[session.type];
}

/**
 * One entry per session. A performed session that answers a prescription becomes
 * a single `paired` entry rather than two rows saying the same thing twice — the
 * duplication that made Planning and History unreadable side by side.
 */
function buildEntries(
  activities: readonly ClientActivity[],
  plannedSessions: readonly ClientPlannedSession[],
): ThreadEntry[] {
  const claimedPlannedIds = new Set<string>();

  const performed = activities.map((activity): ThreadEntry => {
    const planned = activity.plannedSession ?? null;
    if (planned) claimedPlannedIds.add(planned.id);
    return {
      id: activity.id,
      dayKey: localDayKey(activity.date),
      type: activity.type,
      title: activityTitle(activity),
      kind: planned ? 'paired' : 'done',
      activity,
      planned: planned as ClientPlannedSession | null,
    };
  });

  const outstanding = plannedSessions
    .filter((session) => !session.activityId && !claimedPlannedIds.has(session.id))
    .map((session): ThreadEntry => ({
      id: session.id,
      dayKey: localDayKey(session.date),
      type: session.type,
      title: plannedTitle(session),
      kind: 'planned',
      activity: null,
      planned: session,
    }));

  return [...performed, ...outstanding];
}

function loadOf(entry: ThreadEntry): { done: number; planned: number } {
  const done = entry.activity?.load ?? 0;
  const planned = entry.planned?.load ?? 0;
  return { done, planned };
}

export function buildThread({
  activities,
  plannedSessions,
  pivot,
  weeksBack,
}: {
  activities: readonly ClientActivity[];
  plannedSessions: readonly ClientPlannedSession[];
  pivot: Date;
  /** How far into the past the window reaches. The future is never truncated:
   *  everything planned is what the athlete is committed to. */
  weeksBack: number;
}): ThreadWeek[] {
  const pivotWeekStart = weekStart(pivot);
  const floor = new Date(pivotWeekStart);
  floor.setDate(floor.getDate() - weeksBack * 7);
  const currentWeekKey = isoWeekKey(pivot);
  const pivotDayKey = localDayKey(pivot);

  const byWeek = new Map<string, ThreadEntry[]>();
  for (const entry of buildEntries(activities, plannedSessions)) {
    const [year, month, day] = entry.dayKey.split('-').map(Number);
    const date = new Date(year!, (month ?? 1) - 1, day ?? 1);
    if (date < floor) continue;
    const key = isoWeekKey(date);
    const bucket = byWeek.get(key);
    if (bucket) bucket.push(entry);
    else byWeek.set(key, [entry]);
  }

  const weeks: ThreadWeek[] = [];
  for (const [weekKey, entries] of byWeek) {
    const byDay = new Map<string, ThreadEntry[]>();
    for (const entry of entries) {
      const bucket = byDay.get(entry.dayKey);
      if (bucket) bucket.push(entry);
      else byDay.set(entry.dayKey, [entry]);
    }

    const days: ThreadDay[] = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dayKey, dayEntries]) => {
        const [year, month, day] = dayKey.split('-').map(Number);
        return {
          dayKey,
          date: new Date(year!, (month ?? 1) - 1, day ?? 1),
          entries: dayEntries,
        };
      });

    const totals = entries.reduce(
      (acc, entry) => {
        const { done, planned } = loadOf(entry);
        return {
          done: acc.done + done,
          planned: acc.planned + planned,
          doneKnown: acc.doneKnown || entry.activity?.load != null,
        };
      },
      { done: 0, planned: 0, doneKnown: false },
    );

    const start = days[0]?.date ?? pivotWeekStart;
    weeks.push({
      weekKey,
      label: weekLabel(weekKey),
      start: weekStart(start),
      days,
      doneLoad: Math.round(totals.done),
      doneLoadKnown: totals.doneKnown,
      plannedLoad: Math.round(totals.planned),
      isCurrent: weekKey === currentWeekKey,
      isFuture: days.every((d) => d.dayKey > pivotDayKey),
    });
  }

  return weeks.sort((a, b) => a.weekKey.localeCompare(b.weekKey));
}

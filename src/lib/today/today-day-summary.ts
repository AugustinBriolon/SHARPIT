import { isSameDay, startOfDay } from 'date-fns';
import type { ActivityType } from '@prisma/client';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import {
  brickLegSummaries,
  groupPlannedSessions,
  type BrickLegSummary,
} from '@/lib/planned-session/brick/brick-sessions';
import { activityTypeLabels, formatDuration } from '@/lib/format';
import { formatPlannedDuration, intensityLabels } from '@/lib/planned-session/sessions';

export type DaySummaryLine = {
  id: string;
  kind: 'done' | 'planned' | 'missed';
  activityType: ActivityType;
  primary: string;
  secondary?: string;
  /** Set for single planned sessions — enables shared label atoms in the UI. */
  plannedSession?: ClientPlannedSession;
  /** Set for a brick line — the athlete sees one card with each leg behind a dropdown. */
  brickLegs?: BrickLegSummary[];
};

export type TodayDaySummary = {
  sectionLabel: string;
  lines: DaySummaryLine[];
  isEmpty: boolean;
};

/**
 * Past planned sessions that were never realized (no activity, not completed).
 * Looked back up to `lookbackDays` from the reference date.
 */
export function findMissedPlannedSessions(
  plannedSessions: ClientPlannedSession[],
  ref: Date,
  lookbackDays = 7,
): ClientPlannedSession[] {
  const refDay = startOfDay(ref);
  const cutoff = startOfDay(new Date(refDay.getTime() - lookbackDays * 86_400_000));
  return plannedSessions
    .filter((s) => {
      if (s.completed || s.activityId) return false;
      const day = startOfDay(new Date(s.date));
      return day < refDay && day >= cutoff;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function buildTodayDaySummary(
  date: Date,
  activities: ClientActivity[],
  plannedSessions: ClientPlannedSession[],
  goalTitleById?: ReadonlyMap<string, string>,
): TodayDaySummary {
  const refDay = startOfDay(date);

  const todayActivities = activities
    .filter((a) => isSameDay(new Date(a.date), refDay))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Prefer activity→planned reverse link when plannedSessions cache lags after Instant link.
  const linkedPlannedIds = new Set(
    [
      ...plannedSessions.map((s) => (s.activityId ? s.id : null)),
      ...activities.map((a) => a.plannedSession?.id ?? null),
    ].filter((id): id is string => id != null),
  );

  const todayPlanned = plannedSessions.filter(
    (s) =>
      isSameDay(new Date(s.date), refDay) &&
      !s.completed &&
      !s.activityId &&
      !linkedPlannedIds.has(s.id),
  );

  const doneLines: DaySummaryLine[] = todayActivities.map((a) => ({
    id: a.id,
    kind: 'done' as const,
    activityType: a.type,
    primary: activityLabel(a),
    secondary: activityMeta(a),
  }));

  const plannedLines = buildPlannedLines(todayPlanned, goalTitleById);
  const lines = [...doneLines, ...plannedLines];

  if (lines.length === 0) {
    return {
      sectionLabel: "Aujourd'hui",
      lines: [],
      isEmpty: true,
    };
  }

  return {
    sectionLabel: resolveSectionLabel(doneLines.length, plannedLines.length),
    lines,
    isEmpty: false,
  };
}

function buildPlannedLines(
  todayPlanned: ClientPlannedSession[],
  goalTitleById?: ReadonlyMap<string, string>,
): DaySummaryLine[] {
  const groups = groupPlannedSessions(todayPlanned);
  const lines: DaySummaryLine[] = [];

  for (const group of groups) {
    if (group.kind === 'brick') {
      const totalMin = group.sessions.reduce((sum, s) => sum + (s.durationMin ?? 0), 0);
      const brickGoalId = group.sessions.find((s) => s.goalId)?.goalId;
      const brickGoalTitle = brickGoalId ? goalTitleById?.get(brickGoalId) : undefined;
      const duration = formatPlannedDuration(totalMin);
      lines.push({
        id: group.id,
        kind: 'planned',
        activityType: 'TRIATHLON',
        primary: `Brick · ${group.sessions.map((s) => activityTypeLabels[s.type]).join(' → ')}`,
        secondary: [duration, brickGoalTitle ? `Sert ${brickGoalTitle}` : null]
          .filter(Boolean)
          .join(' · '),
        // First leg backs the deep-link id; the card itself renders every leg.
        plannedSession: group.sessions[0],
        brickLegs: brickLegSummaries(group.sessions),
      });
    } else {
      const { session } = group;
      lines.push({
        id: session.id,
        kind: 'planned',
        activityType: session.type,
        primary: plannedLabel(session),
        secondary: plannedMeta(session, goalTitleById),
        plannedSession: session,
      });
    }
  }

  return lines;
}

function resolveSectionLabel(doneCount: number, plannedCount: number): string {
  if (doneCount > 0 && plannedCount > 0) {
    return "Aujourd'hui · réalisé et à venir";
  }

  if (doneCount > 0) {
    return doneCount === 1 ? "Réalisé aujourd'hui" : `Réalisé aujourd'hui · ${doneCount} séances`;
  }

  return "Prévu aujourd'hui";
}

function activityLabel(activity: ClientActivity): string {
  const plannedTitle = activity.plannedSession?.title?.trim();
  if (plannedTitle) return plannedTitle;
  const title = activity.title?.trim();
  return title ?? activityTypeLabels[activity.type];
}

function plannedLabel(session: ClientPlannedSession): string {
  const title = session.title?.trim();
  return title ?? activityTypeLabels[session.type];
}

/**
 * What a finished session cost, on one line.
 *
 * RPE was fetched, carried all the way here, and dropped — the home screen showed
 * duration and TSS, both of which a watch computes, and left out the only number
 * the athlete supplies himself. It is also the one that disagrees: same load, a
 * rising RPE, is fatigue the load model cannot see.
 *
 * Spelled "RPE 7" to match the activity detail header. The two lines are
 * deliberately not sharing a formatter — one is a compact summary that drops
 * empty parts, the other a detail header that always leads with duration, and
 * they answer to different screens.
 */
function activityMeta(activity: ClientActivity): string | undefined {
  const parts: string[] = [];
  if (activity.duration) parts.push(formatDuration(activity.duration));
  if (activity.load != null) parts.push(`${Math.round(activity.load)} TSS`);
  if (activity.rpe != null) parts.push(`RPE ${activity.rpe}`);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function plannedMeta(
  session: ClientPlannedSession,
  goalTitleById?: ReadonlyMap<string, string>,
): string | undefined {
  const parts: string[] = [];
  if (session.intensity) parts.push(intensityLabels[session.intensity]);
  if (session.durationMin) parts.push(formatPlannedDuration(session.durationMin));
  if (session.load != null) parts.push(`${Math.round(session.load)} TSS`);
  if (session.goalId) {
    const title = goalTitleById?.get(session.goalId);
    if (title) parts.push(`Sert ${title}`);
  }
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

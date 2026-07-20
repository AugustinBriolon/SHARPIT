import { isSameDay, startOfDay } from 'date-fns';
import type { ActivityType } from '@prisma/client';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { groupPlannedSessions } from '@/lib/brick-sessions';
import { activityTypeLabels, formatDuration } from '@/lib/format';
import { formatPlannedDuration, intensityLabels } from '@/lib/sessions';

export type DaySummaryLine = {
  id: string;
  kind: 'done' | 'planned';
  activityType: ActivityType;
  primary: string;
  secondary?: string;
  /** Set for single planned sessions — enables shared label atoms in the UI. */
  plannedSession?: ClientPlannedSession;
};

export type TodayDaySummary = {
  sectionLabel: string;
  lines: DaySummaryLine[];
  isEmpty: boolean;
};

export function buildTodayDaySummary(
  date: Date,
  activities: ClientActivity[],
  plannedSessions: ClientPlannedSession[],
): TodayDaySummary {
  const refDay = startOfDay(date);

  const todayActivities = activities
    .filter((a) => isSameDay(new Date(a.date), refDay))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const todayPlanned = plannedSessions.filter(
    (s) => isSameDay(new Date(s.date), refDay) && !s.completed && !s.activityId,
  );

  const doneLines: DaySummaryLine[] = todayActivities.map((a) => ({
    id: a.id,
    kind: 'done' as const,
    activityType: a.type,
    primary: activityLabel(a),
    secondary: activityMeta(a),
  }));

  const plannedLines = buildPlannedLines(todayPlanned);
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

function buildPlannedLines(todayPlanned: ClientPlannedSession[]): DaySummaryLine[] {
  const groups = groupPlannedSessions(todayPlanned);
  const lines: DaySummaryLine[] = [];

  for (const group of groups) {
    if (group.kind === 'brick') {
      const totalMin = group.sessions.reduce((sum, s) => sum + (s.durationMin ?? 0), 0);
      lines.push({
        id: group.id,
        kind: 'planned',
        activityType: 'TRIATHLON',
        primary: `Brick · ${group.sessions.map((s) => activityTypeLabels[s.type]).join(' → ')}`,
        secondary: formatPlannedDuration(totalMin),
        // Deep-link opens the first leg dialog (brick analysis lives on that session).
        plannedSession: group.sessions[0],
      });
    } else {
      const { session } = group;
      lines.push({
        id: session.id,
        kind: 'planned',
        activityType: session.type,
        primary: plannedLabel(session),
        secondary: plannedMeta(session),
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
  const title = activity.title?.trim();
  return title ?? activityTypeLabels[activity.type];
}

function plannedLabel(session: ClientPlannedSession): string {
  const title = session.title?.trim();
  return title ?? activityTypeLabels[session.type];
}

function activityMeta(activity: ClientActivity): string | undefined {
  const parts: string[] = [];
  if (activity.duration) parts.push(formatDuration(activity.duration));
  if (activity.load != null) parts.push(`${Math.round(activity.load)} TSS`);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function plannedMeta(session: ClientPlannedSession): string | undefined {
  const parts: string[] = [];
  if (session.intensity) parts.push(intensityLabels[session.intensity]);
  if (session.durationMin) parts.push(formatPlannedDuration(session.durationMin));
  if (session.load != null) parts.push(`${Math.round(session.load)} TSS`);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

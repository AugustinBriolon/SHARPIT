import { isSameDay, startOfDay } from 'date-fns';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import { groupPlannedSessions } from '@/lib/brick-sessions';
import { activityTypeLabels, formatDuration } from '@/lib/format';
import { formatPlannedDuration, intensityLabels } from '@/lib/sessions';

export type DaySummaryLine = {
  id: string;
  kind: 'done' | 'planned';
  primary: string;
  secondary?: string;
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

  if (todayActivities.length > 0) {
    return {
      sectionLabel:
        todayActivities.length === 1
          ? "Réalisé aujourd'hui"
          : `Réalisé aujourd'hui · ${todayActivities.length} séances`,
      lines: todayActivities.map((a) => ({
        id: a.id,
        kind: 'done' as const,
        primary: activityLabel(a),
        secondary: activityMeta(a),
      })),
      isEmpty: false,
    };
  }

  const todayPlanned = plannedSessions.filter(
    (s) => isSameDay(new Date(s.date), refDay) && !s.completed && !s.activityId,
  );

  if (todayPlanned.length > 0) {
    const groups = groupPlannedSessions(todayPlanned);
    const lines: DaySummaryLine[] = [];

    for (const group of groups) {
      if (group.kind === 'brick') {
        const totalMin = group.sessions.reduce((sum, s) => sum + (s.durationMin ?? 0), 0);
        lines.push({
          id: group.id,
          kind: 'planned',
          primary: `Brick · ${group.sessions.map((s) => activityTypeLabels[s.type]).join(' → ')}`,
          secondary: formatPlannedDuration(totalMin),
        });
      } else {
        const { session } = group;
        lines.push({
          id: session.id,
          kind: 'planned',
          primary: plannedLabel(session),
          secondary: plannedMeta(session),
        });
      }
    }

    return {
      sectionLabel: "Prévu aujourd'hui",
      lines,
      isEmpty: false,
    };
  }

  return {
    sectionLabel: "Aujourd'hui",
    lines: [],
    isEmpty: true,
  };
}

function activityLabel(activity: ClientActivity): string {
  const type = activityTypeLabels[activity.type];
  const title = activity.title?.trim();
  return title ? `${type} · ${title}` : type;
}

function activityMeta(activity: ClientActivity): string | undefined {
  const parts: string[] = [];
  if (activity.duration) parts.push(formatDuration(activity.duration));
  if (activity.load != null) parts.push(`${Math.round(activity.load)} TSS`);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function plannedLabel(session: ClientPlannedSession): string {
  const type = activityTypeLabels[session.type];
  const title = session.title?.trim();
  return title ? `${type} · ${title}` : type;
}

function plannedMeta(session: ClientPlannedSession): string | undefined {
  const parts: string[] = [];
  if (session.intensity) parts.push(intensityLabels[session.intensity]);
  if (session.durationMin) parts.push(formatPlannedDuration(session.durationMin));
  if (session.load != null) parts.push(`${Math.round(session.load)} TSS`);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

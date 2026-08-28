import { isSameDay, startOfDay } from 'date-fns';
import type { ActivityType } from '@prisma/client';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import {
  isDemoSessionLinkActivityTitle,
  isDemoSessionLinkPlannedTitle,
} from '@/lib/demo/demo-session-link-markers';
import { scorePlannedActivityMatch } from '@/lib/planned-session/linking/session-link-match-score';
import { activityTypeLabels, formatDuration } from '@/lib/format';
import { formatPlannedDuration, intensityLabels } from '@/lib/planned-session/sessions';

export type SessionLinkSuggestion = {
  id: string;
  plannedSessionId: string;
  activityId: string;
  activityType: ActivityType;
  score: number;
  matchLabel: string;
  plannedPrimary: string;
  plannedSecondary?: string;
  activityPrimary: string;
  activitySecondary?: string;
};

function activityPrimary(activity: ClientActivity): string {
  const plannedTitle = activity.plannedSession?.title?.trim();
  if (plannedTitle) {
    return plannedTitle;
  }
  const title = activity.title?.trim();
  return title ?? activityTypeLabels[activity.type];
}

function activitySecondary(activity: ClientActivity): string | undefined {
  const parts: string[] = [];
  if (activity.duration) {
    parts.push(formatDuration(activity.duration));
  }
  if ((activity.load !== undefined && activity.load !== null)) {
    parts.push(`${Math.round(activity.load)} TSS`);
  }
  if ((activity.rpe !== undefined && activity.rpe !== null)) {
    parts.push(`RPE ${activity.rpe}`);
  }
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function plannedPrimary(session: ClientPlannedSession): string {
  const title = session.title?.trim();
  return title ?? activityTypeLabels[session.type];
}

function plannedSecondary(session: ClientPlannedSession): string | undefined {
  const parts: string[] = [];
  if (session.intensity) {
    parts.push(intensityLabels[session.intensity]);
  }
  if (session.durationMin) {
    parts.push(formatPlannedDuration(session.durationMin));
  }
  if ((session.load !== undefined && session.load !== null)) {
    parts.push(`${Math.round(session.load)} TSS`);
  }
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function matchLabelForScore(score: number): string {
  if (score >= 120) {
    return 'Correspondance forte';
  }
  if (score >= 100) {
    return 'Même jour · même discipline';
  }
  return 'Rapprochement possible';
}

function collectLinkedPlannedIds(
  activities: ClientActivity[],
  plannedSessions: ClientPlannedSession[],
): Set<string> {
  return new Set(
    [
      ...plannedSessions.map((session) => (session.activityId ? session.id : null)),
      ...activities.map((activity) => activity.plannedSession?.id ?? null),
    ].filter((id): id is string => (id !== undefined && id !== null)),
  );
}

function filterTodayActivities(
  activities: ClientActivity[],
  refDay: Date,
): ClientActivity[] {
  return activities.filter((activity) => isSameDay(new Date(activity.date), refDay) && !activity.plannedSession);
}

function filterTodayPlanned(
  plannedSessions: ClientPlannedSession[],
  refDay: Date,
  linkedPlannedIds: Set<string>,
): ClientPlannedSession[] {
  return plannedSessions.filter(
    (session) =>
      isSameDay(new Date(session.date), refDay) &&
      !session.completed &&
      !session.activityId &&
      !linkedPlannedIds.has(session.id),
  );
}

function buildDemoLinkSuggestions(
  todayActivities: ClientActivity[],
  todayPlanned: ClientPlannedSession[],
  usedActivities: Set<string>,
  usedPlanned: Set<string>,
): SessionLinkSuggestion[] {
  const suggestions: SessionLinkSuggestion[] = [];
  for (const activity of todayActivities) {
    if (!isDemoSessionLinkActivityTitle(activity.title)) {
      continue;
    }
    const planned = todayPlanned.find((session) => isDemoSessionLinkPlannedTitle(session.title));
    if (!planned) {
      continue;
    }
    usedActivities.add(activity.id);
    usedPlanned.add(planned.id);
    suggestions.push(buildSuggestion(activity, planned, 200));
  }
  return suggestions;
}

function buildLinkCandidates(
  todayActivities: ClientActivity[],
  todayPlanned: ClientPlannedSession[],
  usedActivities: Set<string>,
  usedPlanned: Set<string>,
): Array<{ activity: ClientActivity; planned: ClientPlannedSession; score: number }> {
  const candidates: Array<{ activity: ClientActivity; planned: ClientPlannedSession; score: number }> = [];
  for (const activity of todayActivities) {
    if (usedActivities.has(activity.id)) {
      continue;
    }
    for (const planned of todayPlanned) {
      if (usedPlanned.has(planned.id) || isDemoSessionLinkPlannedTitle(planned.title)) {
        continue;
      }
      if (activity.type !== planned.type) {
        continue;
      }
      const score = scorePlannedActivityMatch(
        { date: planned.date, durationMin: planned.durationMin },
        { date: activity.date, duration: activity.duration },
      );
      if (score > 0) {
        candidates.push({ activity, planned, score });
      }
    }
  }
  return candidates;
}

function greedyMatchCandidates(
  candidates: Array<{ activity: ClientActivity; planned: ClientPlannedSession; score: number }>,
  usedActivities: Set<string>,
  usedPlanned: Set<string>,
): SessionLinkSuggestion[] {
  const suggestions: SessionLinkSuggestion[] = [];
  candidates.sort((a, b) => b.score - a.score);
  for (const { activity, planned, score } of candidates) {
    if (usedActivities.has(activity.id) || usedPlanned.has(planned.id)) {
      continue;
    }
    usedActivities.add(activity.id);
    usedPlanned.add(planned.id);
    suggestions.push(buildSuggestion(activity, planned, score));
  }
  return suggestions;
}

/**
 * Pair unlinked same-day activities with orphan planned sessions of the same type.
 * Greedy one-to-one by score — highest confidence first.
 */
export function findSessionLinkSuggestions(
  date: Date,
  activities: ClientActivity[],
  plannedSessions: ClientPlannedSession[],
): SessionLinkSuggestion[] {
  const refDay = startOfDay(date);
  const linkedPlannedIds = collectLinkedPlannedIds(activities, plannedSessions);
  const todayActivities = filterTodayActivities(activities, refDay);
  const todayPlanned = filterTodayPlanned(plannedSessions, refDay, linkedPlannedIds);

  const usedActivities = new Set<string>();
  const usedPlanned = new Set<string>();
  const demoSuggestions = buildDemoLinkSuggestions(
    todayActivities,
    todayPlanned,
    usedActivities,
    usedPlanned,
  );
  const candidates = buildLinkCandidates(todayActivities, todayPlanned, usedActivities, usedPlanned);
  return [...demoSuggestions, ...greedyMatchCandidates(candidates, usedActivities, usedPlanned)];
}

function buildSuggestion(
  activity: ClientActivity,
  planned: ClientPlannedSession,
  score: number,
): SessionLinkSuggestion {
  return {
    id: `${planned.id}:${activity.id}`,
    plannedSessionId: planned.id,
    activityId: activity.id,
    activityType: activity.type,
    score,
    matchLabel: matchLabelForScore(score),
    plannedPrimary: plannedPrimary(planned),
    plannedSecondary: plannedSecondary(planned),
    activityPrimary: activityPrimary(activity),
    activitySecondary: activitySecondary(activity),
  };
}

export function idsExcludedByLinkSuggestions(
  suggestions: readonly Pick<SessionLinkSuggestion, 'plannedSessionId' | 'activityId'>[],
): {
  activityIds: Set<string>;
  plannedSessionIds: Set<string>;
} {
  return {
    activityIds: new Set(suggestions.map((s) => s.activityId)),
    plannedSessionIds: new Set(suggestions.map((s) => s.plannedSessionId)),
  };
}

export function mergeLinkExclusions(
  ...sources: ReadonlyArray<{ activityIds: Set<string>; plannedSessionIds: Set<string> }>
): { activityIds: Set<string>; plannedSessionIds: Set<string> } {
  const activityIds = new Set<string>();
  const plannedSessionIds = new Set<string>();
  for (const source of sources) {
    for (const id of source.activityIds) {
      activityIds.add(id);
    }
    for (const id of source.plannedSessionIds) {
      plannedSessionIds.add(id);
    }
  }
  return { activityIds, plannedSessionIds };
}

/** Hide paired chips while a link decision is still pending (card owns the decision). */
export function filterDaySummaryForLinkExclusions<
  T extends { id: string; kind: 'done' | 'planned' | 'missed' },
>(
  lines: readonly T[],
  excluded: { activityIds: Set<string>; plannedSessionIds: Set<string> },
): T[] {
  if (excluded.activityIds.size === 0 && excluded.plannedSessionIds.size === 0) {
    return [...lines];
  }
  return lines.filter((line) => {
    if (line.kind === 'done' && excluded.activityIds.has(line.id)) {
      return false;
    }
    if (
      (line.kind === 'planned' || line.kind === 'missed') &&
      excluded.plannedSessionIds.has(line.id)
    ) {
      return false;
    }
    return true;
  });
}

/** @deprecated Use filterDaySummaryForLinkExclusions with mergeLinkExclusions. */
export function filterDaySummaryForPendingLinkSuggestions<
  T extends { id: string; kind: 'done' | 'planned' | 'missed' },
>(lines: readonly T[], suggestions: readonly SessionLinkSuggestion[]): T[] {
  return filterDaySummaryForLinkExclusions(lines, idsExcludedByLinkSuggestions(suggestions));
}

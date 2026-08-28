import { TWIN_DRILL_DOWN } from '@/lib/today/today-twin-navigation';
import { isDemoSessionLinkActivityTitle } from '@/lib/demo/demo-session-link-markers';

export type PostSessionLoopInput = {
  phase: string;
  overallFresh: boolean;
  activities: Array<{
    id: string;
    title: string | null;
    typeLabel: string;
    date: Date | string;
    rpe: number | null;
    feeling: string | null;
  }>;
  /** Most recent activity today wins. */
  day: Date;
  /** Activities awaiting a link decision — no post-session loop for them. */
  excludeActivityIds?: ReadonlySet<string>;
};

export type PostSessionLoopView = {
  visible: true;
  activityId: string;
  activityTitle: string;
  needsFeeling: boolean;
  narrativeHref: string;
  freshnessLine: string | null;
} | null;

/**
 * Closes the post-effort UX loop on Today (PRODUCT moments 7–8):
 * light ressenti CTA + link to activity narrative + sync freshness line.
 */
function activitiesToday(
  activities: PostSessionLoopInput['activities'],
  day: Date,
): PostSessionLoopInput['activities'] {
  const dayStart = startOfLocalDay(day).getTime();
  const dayEnd = dayStart + 86_400_000;
  return activities
    .filter((activity) => {
      const time = new Date(activity.date).getTime();
      return time >= dayStart && time < dayEnd;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

function pickLatestActivity(
  todayActivities: PostSessionLoopInput['activities'],
  excludeActivityIds?: ReadonlySet<string>,
): PostSessionLoopInput['activities'][number] | undefined {
  const substantive = todayActivities.filter(
    (activity) =>
      !isDemoSessionLinkActivityTitle(activity.title) &&
      !(excludeActivityIds?.has(activity.id) ?? false),
  );
  return (substantive.length > 0 ? substantive : todayActivities)[0];
}

function activityNeedsFeeling(activity: PostSessionLoopInput['activities'][number]): boolean {
  return (activity.rpe === undefined || activity.rpe === null) && ((activity.feeling === undefined || activity.feeling === null) || activity.feeling.trim() === '');
}

function buildVisiblePostSessionLoop(
  latest: PostSessionLoopInput['activities'][number],
  needsFeeling: boolean,
  freshnessLine: string | null,
): PostSessionLoopView {
  return {
    visible: true,
    activityId: latest.id,
    activityTitle: latest.title?.trim() || latest.typeLabel,
    needsFeeling,
    narrativeHref: TWIN_DRILL_DOWN.activity(latest.id),
    freshnessLine,
  };
}

export function buildPostSessionLoop(input: PostSessionLoopInput): PostSessionLoopView {
  if (input.phase !== 'SESSION_COMPLETED' && input.phase !== 'RECOVERY_WINDOW') {
    return null;
  }

  const latest = pickLatestActivity(activitiesToday(input.activities, input.day), input.excludeActivityIds);
  if (!latest) {
    return null;
  }

  const needsFeeling = activityNeedsFeeling(latest);
  const freshnessLine = input.overallFresh ? 'Twin à jour — ta séance est intégrée.' : null;
  if (!needsFeeling && !freshnessLine) {
    return null;
  }

  return buildVisiblePostSessionLoop(latest, needsFeeling, freshnessLine);
}

function startOfLocalDay(day: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate());
}

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
export function buildPostSessionLoop(input: PostSessionLoopInput): PostSessionLoopView {
  if (input.phase !== 'SESSION_COMPLETED' && input.phase !== 'RECOVERY_WINDOW') {
    return null;
  }

  const dayStart = startOfLocalDay(input.day).getTime();
  const dayEnd = dayStart + 86_400_000;
  const todayActivities = input.activities
    .filter((a) => {
      const t = new Date(a.date).getTime();
      return t >= dayStart && t < dayEnd;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const substantive = todayActivities.filter(
    (a) =>
      !isDemoSessionLinkActivityTitle(a.title) && !(input.excludeActivityIds?.has(a.id) ?? false),
  );
  const [latest] = substantive.length > 0 ? substantive : todayActivities;
  if (!latest) {
    return null;
  }

  const needsFeeling =
    latest.rpe === null && (latest.feeling === null || latest.feeling.trim() === '');
  /** Positive affirmation only — syncing/stale already surface via SnapshotStatusBanner. */
  const freshnessLine = input.overallFresh ? 'Twin à jour — ta séance est intégrée.' : null;

  // Nothing left to prompt for: RPE/feeling are already in, and freshness isn't
  // worth a banner on its own. Without one of those the card was just repeating
  // the "Voir le récit" link the day summary already shows for this activity.
  if (!needsFeeling && !freshnessLine) {
    return null;
  }

  return {
    visible: true,
    activityId: latest.id,
    activityTitle: latest.title?.trim() || latest.typeLabel,
    needsFeeling,
    narrativeHref: TWIN_DRILL_DOWN.activity(latest.id),
    freshnessLine,
  };
}

function startOfLocalDay(day: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate());
}

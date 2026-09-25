import { ActivityType } from '@prisma/client';
import { isEligibleForActivityNarrative } from '@/lib/activity/narrative/activity-narrative-config';
import { isActivityToday } from '@/lib/activity/list/activity-day';
import {
  NARRATIVE_TYPES,
  parseNarrative,
} from '@/components/training/activity/insights/activity-narrative-helpers';

export function hasNarrativeAnalysis(
  narrativeAnalysis: unknown,
  narrativeAnalyzedAt: Date | string | null,
): boolean {
  return Boolean(parseNarrative(narrativeAnalysis) && narrativeAnalyzedAt);
}

export function isNarrativeTypeEligible(
  coachEnabled: boolean,
  activityType: ActivityType,
  activityDate: Date | string,
): boolean {
  return (
    coachEnabled &&
    NARRATIVE_TYPES.has(activityType) &&
    isEligibleForActivityNarrative(new Date(activityDate))
  );
}

export function isNarrativeBackgroundPending({
  eligible,
  hasAnalysis,
  pollTimedOut,
  generating,
  activityDate,
  isDemoLinkStory,
  demoReadingPending,
}: {
  eligible: boolean;
  hasAnalysis: boolean;
  pollTimedOut: boolean;
  generating: boolean;
  activityDate: Date | string;
  isDemoLinkStory: boolean;
  demoReadingPending: boolean;
}): boolean {
  if (
    !eligible ||
    hasAnalysis ||
    pollTimedOut ||
    generating ||
    isDemoLinkStory ||
    demoReadingPending
  ) {
    return false;
  }
  return isActivityToday(new Date(activityDate));
}

import {
  hasNarrativeAnalysis,
  isNarrativeBackgroundPending,
  isNarrativeTypeEligible,
} from '@/components/training/activity/insights/activity-narrative-state';
import { ActivityType } from '@prisma/client';

export function deriveNarrativeSectionFlags({
  coachEnabled,
  activityType,
  activityDate,
  narrativeAnalysis,
  narrativeAnalyzedAt,
  pollTimedOut,
  generating,
  isDemoLinkStory,
  demoReadingPending,
}: {
  coachEnabled: boolean;
  activityType: ActivityType;
  activityDate: Date | string;
  narrativeAnalysis: unknown;
  narrativeAnalyzedAt: Date | string | null;
  pollTimedOut: boolean;
  generating: boolean;
  isDemoLinkStory: boolean;
  demoReadingPending: boolean;
}) {
  const hasAnalysis = hasNarrativeAnalysis(narrativeAnalysis, narrativeAnalyzedAt);
  const eligible = isNarrativeTypeEligible(coachEnabled, activityType, activityDate);
  const isPending = isNarrativeBackgroundPending({
    eligible,
    hasAnalysis,
    pollTimedOut,
    generating,
    activityDate,
    isDemoLinkStory,
    demoReadingPending,
  });

  return { hasAnalysis, eligible, isPending };
}

'use client';

import { useIsDemoMode } from '@/hooks/use-is-demo-mode';
import { isDemoSessionLinkActivityTitle } from '@/lib/demo/demo-session-link-markers';
import { findDemoSessionLinkByActivityId } from '@/lib/demo/demo-session-link-state';
import { useActivities } from '@/hooks/use-data';
import { useDemoSessionLinksSnapshot } from '@/hooks/use-demo-session-link-overlay';

function isDemoLinkStory(
  isDemo: boolean,
  demoLink: ReturnType<typeof findDemoSessionLinkByActivityId>,
  activityTitle: string | null | undefined,
): boolean {
  if (!isDemo) {
    return false;
  }
  return Boolean(demoLink) || isDemoSessionLinkActivityTitle(activityTitle ?? undefined);
}

export function useDemoNarrativeOverlay(activityId: string) {
  const isDemo = useIsDemoMode();
  useDemoSessionLinksSnapshot();
  const activitiesQuery = useActivities();
  const activityTitle = activitiesQuery.data?.find((item) => item.id === activityId)?.title;
  const demoLink = findDemoSessionLinkByActivityId(activityId);
  const isDemoLinkStoryFlag = isDemoLinkStory(isDemo, demoLink, activityTitle);
  const demoReading = demoLink?.reading ?? null;
  const demoReadingPending = isDemoLinkStoryFlag && Boolean(demoLink) && !demoReading;

  return {
    isDemo,
    demoLink,
    isDemoLinkStory: isDemoLinkStoryFlag,
    demoReading,
    demoReadingPending,
  };
}

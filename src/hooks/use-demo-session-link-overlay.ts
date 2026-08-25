'use client';

import { useSyncExternalStore } from 'react';
import { useActivities, usePlannedSessions } from '@/hooks/use-data';
import type { ClientPlannedSession } from '@/lib/query/types';
import {
  getDemoSessionLinksSnapshot,
  readDemoSessionLinks,
  subscribeDemoSessionLinks,
} from '@/lib/demo/demo-session-link-state';
import {
  overlayDemoLinkOnPlannedSession,
  resolveDemoLinkedPlannedSessionForActivity,
} from '@/lib/demo/demo-session-link-overlay';
import type { ActivityDetail } from '@/components/training/activity/detail/types';

function useDemoSessionLinks() {
  useSyncExternalStore(subscribeDemoSessionLinks, getDemoSessionLinksSnapshot, () => '');
  return readDemoSessionLinks();
}

/** Re-render when demo link / reading sessionStorage changes. */
export function useDemoSessionLinksSnapshot(): void {
  useSyncExternalStore(subscribeDemoSessionLinks, getDemoSessionLinksSnapshot, () => '');
}

export function useDemoActivityPlannedSession(
  activityId: string,
  serverPlannedSession: ActivityDetail['plannedSession'],
): ActivityDetail['plannedSession'] {
  const links = useDemoSessionLinks();
  const plannedQuery = usePlannedSessions();

  return resolveDemoLinkedPlannedSessionForActivity(
    activityId,
    serverPlannedSession,
    plannedQuery.data,
    links,
  );
}

export function useDemoPlannedSessionOverlay(
  session: ClientPlannedSession | null | undefined,
): ClientPlannedSession | null | undefined {
  const links = useDemoSessionLinks();
  const activitiesQuery = useActivities();

  if (!session) return session;
  return overlayDemoLinkOnPlannedSession(session, activitiesQuery.data, links);
}

import type { ActivityType, SessionIntensity } from '@prisma/client';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';
import type { ActivityDetail } from '@/components/training/activity/detail/types';
import {
  readDemoSessionLinks,
  type DemoSessionLinkReading,
} from '@/lib/demo/demo-session-link-state';

export type DemoLinkPlannedSnapshot = {
  title?: string | null;
  type: ActivityType;
  date: string;
  durationMin?: number | null;
  intensity?: SessionIntensity | null;
  description?: string | null;
};

export type DemoLinkEntry = {
  plannedSessionId: string;
  activityId: string;
  planned?: DemoLinkPlannedSnapshot;
  reading?: DemoSessionLinkReading;
};

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function findDemoLinkByActivityId(
  activityId: string,
  links: readonly DemoLinkEntry[] = readDemoSessionLinks(),
): DemoLinkEntry | undefined {
  return links.find((entry) => entry.activityId === activityId);
}

export function findDemoLinkByPlannedSessionId(
  plannedSessionId: string,
  links: readonly DemoLinkEntry[] = readDemoSessionLinks(),
): DemoLinkEntry | undefined {
  return links.find((entry) => entry.plannedSessionId === plannedSessionId);
}

export function plannedSessionSummaryFromClient(
  session: Pick<
    ClientPlannedSession,
    | 'id'
    | 'title'
    | 'date'
    | 'type'
    | 'durationMin'
    | 'description'
    | 'intensity'
    | 'analysis'
    | 'analyzedAt'
    | 'brickGroupId'
    | 'brickOrder'
  >,
): NonNullable<ActivityDetail['plannedSession']> {
  return {
    id: session.id,
    title: session.title,
    date: toDate(session.date),
    type: session.type,
    durationMin: session.durationMin,
    description: session.description,
    intensity: session.intensity,
    analysis: session.analysis,
    analyzedAt: session.analyzedAt ? toDate(session.analyzedAt) : null,
    brickGroupId: session.brickGroupId,
    brickOrder: session.brickOrder,
  };
}

function plannedSessionSummaryFromSnapshot(
  plannedSessionId: string,
  snapshot: DemoLinkPlannedSnapshot,
): NonNullable<ActivityDetail['plannedSession']> {
  return {
    id: plannedSessionId,
    title: snapshot.title ?? null,
    date: toDate(snapshot.date),
    type: snapshot.type,
    durationMin: snapshot.durationMin ?? null,
    description: snapshot.description ?? null,
    intensity: snapshot.intensity ?? null,
    analysis: null,
    analyzedAt: null,
    // Demo snapshots never model a brick — nothing to overlay.
    brickGroupId: null,
    brickOrder: null,
  };
}

/** Activity detail RSC payload — overlay demo-only link from sessionStorage. */
export function resolveDemoLinkedPlannedSessionForActivity(
  activityId: string,
  serverPlannedSession: ActivityDetail['plannedSession'],
  plannedSessions: readonly ClientPlannedSession[] | undefined,
  links: readonly DemoLinkEntry[] = readDemoSessionLinks(),
): ActivityDetail['plannedSession'] {
  if (serverPlannedSession) return serverPlannedSession;

  const link = findDemoLinkByActivityId(activityId, links);
  if (!link) return null;

  const session = plannedSessions?.find((item) => item.id === link.plannedSessionId);
  if (session) {
    return withDemoReadingSummary(plannedSessionSummaryFromClient(session), link.reading);
  }
  if (link.planned) {
    return withDemoReadingSummary(
      plannedSessionSummaryFromSnapshot(link.plannedSessionId, link.planned),
      link.reading,
    );
  }
  return null;
}

function withDemoReadingSummary(
  summary: NonNullable<ActivityDetail['plannedSession']>,
  reading: DemoSessionLinkReading | undefined,
): NonNullable<ActivityDetail['plannedSession']> {
  if (!reading) return summary;
  return {
    ...summary,
    analysis: reading.analysis,
    analyzedAt: new Date(reading.analyzedAt),
  };
}

/** Planned-session modal — keep activityId / nested activity in demo after hard navigation. */
export function overlayDemoLinkOnPlannedSession(
  session: ClientPlannedSession,
  activities: readonly ClientActivity[] | undefined,
  links: readonly DemoLinkEntry[] = readDemoSessionLinks(),
): ClientPlannedSession {
  const link = findDemoLinkByPlannedSessionId(session.id, links);
  if (!link) return session;

  const { activityId } = link;
  let patched = session;

  if (session.activityId !== activityId || session.activity?.id !== activityId) {
    const activityFromCache = activities?.find((item) => item.id === activityId);
    const activity =
      activityFromCache ??
      (session.activity?.id === activityId ? session.activity : null) ??
      ({ id: activityId } as NonNullable<ClientPlannedSession['activity']>);

    patched = {
      ...session,
      activityId,
      activity,
      completed: true,
    } as ClientPlannedSession;
  }

  if (!link.reading) return patched;

  const analyzedAt = new Date(link.reading.analyzedAt);
  return {
    ...patched,
    analysis: patched.analysis ?? link.reading.analysis,
    analyzedAt: patched.analyzedAt ?? analyzedAt,
    activity: patched.activity
      ? ({
          ...patched.activity,
          narrativeAnalysis: patched.activity.narrativeAnalysis ?? link.reading.narrative,
          narrativeAnalyzedAt: patched.activity.narrativeAnalyzedAt ?? analyzedAt,
        } as NonNullable<ClientPlannedSession['activity']>)
      : patched.activity,
  } as ClientPlannedSession;
}

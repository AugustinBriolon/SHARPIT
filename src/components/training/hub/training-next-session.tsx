'use client';

import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import { BrickOverviewCard } from '@/components/planning/brick/brick-overview-card';
import { PlannedSessionPreview } from '@/components/today/rich/planned-session-preview';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { activityTypeLabels } from '@/lib/format';
import { buildPlannedSessionPreview } from '@/lib/today/rich/planned-session-metrics';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import {
  brickLegSummaries,
  groupPlannedSessions,
  type DayPlannedItem,
} from '@/lib/planned-session/brick/brick-sessions';
import { comparePlannedSessionsBySchedule } from '@/lib/planned-session/planned-session-dates';
import { formatPlannedDuration } from '@/lib/planned-session/sessions';
import type { ClientPlannedSession } from '@/lib/query/types';
import { useAppModal } from '@/providers/app-modal-provider';
import { usePlannedSessions } from '@/hooks/use-data';

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Open planned sessions scheduled for the local calendar day of `now`, soonest first. */
export function resolveTodaysPlannedSessions(
  sessions: ClientPlannedSession[],
  now = new Date(),
): ClientPlannedSession[] {
  return sessions
    .filter((session) => !session.completed)
    .filter((session) => isSameLocalDay(new Date(session.date), now))
    .sort(comparePlannedSessionsBySchedule);
}

/** Groups today's open sessions so a brick is one preview, not N cards. */
export function resolveTodaysPlannedItems(
  sessions: ClientPlannedSession[],
  now = new Date(),
): DayPlannedItem[] {
  return groupPlannedSessions(resolveTodaysPlannedSessions(sessions, now));
}

function brickSubtitle(sessions: ClientPlannedSession[]): string | null {
  const totalMin = sessions.reduce((sum, session) => sum + (session.durationMin ?? 0), 0);
  return totalMin > 0 ? formatPlannedDuration(totalMin) : null;
}

function sortPlannedItems(items: DayPlannedItem[]): DayPlannedItem[] {
  return [...items].sort((a, b) => {
    const sessionA = a.kind === 'single' ? a.session : a.sessions[0]!;
    const sessionB = b.kind === 'single' ? b.session : b.sessions[0]!;
    return comparePlannedSessionsBySchedule(sessionA, sessionB);
  });
}

function TrainingNextSessionCard({
  session,
  primary,
  density,
}: {
  session: ClientPlannedSession;
  primary: boolean;
  density: 'solo' | 'compact';
}) {
  const queryClient = useQueryClient();
  const { openPlannedSession } = useAppModal();
  const preview = buildPlannedSessionPreview({
    type: session.type,
    durationMin: session.durationMin,
    intensity: session.intensity,
    load: session.load,
    title: session.title,
    description: session.description,
    accessories: session.accessories,
    strengthPrescription: session.strengthPrescription,
  });
  const title = session.title?.trim() || activityTypeLabels[session.type];

  return (
    <PlannedSessionPreview
      activityType={session.type}
      density={density}
      equipment={preview.equipment}
      metrics={preview.metrics}
      primary={primary}
      secondary={session.description}
      title={title}
      onOpen={() => {
        prefetchPlannedSessionDetail(queryClient, session.id);
        openPlannedSession({ sessionId: session.id });
      }}
    />
  );
}

function TrainingBrickCard({
  item,
  primary,
}: {
  item: Extract<DayPlannedItem, { kind: 'brick' }>;
  primary: boolean;
}) {
  const queryClient = useQueryClient();
  const { openPlannedSession } = useAppModal();

  return (
    <BrickOverviewCard
      legs={brickLegSummaries(item.sessions)}
      primary={primary}
      subtitle={brickSubtitle(item.sessions)}
      onOpenLeg={(legId) => {
        prefetchPlannedSessionDetail(queryClient, legId);
        openPlannedSession({ sessionId: legId });
      }}
    />
  );
}

export function TrainingNextSessionFallback() {
  return (
    <section className="space-y-2">
      <DrillDownSectionLabel as="h2">Séances du jour</DrillDownSectionLabel>
      <Skeleton className="rounded-analysis h-24 w-full" />
    </section>
  );
}

/**
 * Today's open planned sessions — bricks grouped, singles as session cards.
 */
export function TrainingNextSession() {
  const { data, isPending } = usePlannedSessions();
  const items = useMemo(() => sortPlannedItems(resolveTodaysPlannedItems(data ?? [])), [data]);

  if (isPending) {
    return <TrainingNextSessionFallback />;
  }

  const density = items.length <= 1 ? 'solo' : 'compact';

  return (
    <section className="space-y-2">
      <DrillDownSectionLabel as="h2">Séances du jour</DrillDownSectionLabel>
      {items.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {items.map((item, index) => (
            <li key={item.kind === 'single' ? item.session.id : item.id}>
              {item.kind === 'brick' ? (
                <TrainingBrickCard item={item} primary={index === 0} />
              ) : (
                <TrainingNextSessionCard
                  density={density}
                  primary={index === 0}
                  session={item.session}
                />
              )}
            </li>
          ))}
        </ul>
      ) : (
        <InkEmptyState
          description="Ouvre le planning pour programmer la suite."
          icon={CalendarClock}
          title="Rien de prévu aujourd'hui"
          compact
        />
      )}
    </section>
  );
}

'use client';

import { useQueryClient } from '@tanstack/react-query';
import { activityTypeLabels } from '@/lib/format';
import { BrickOverviewCard } from '@/components/planning/brick/brick-overview-card';
import type { BrickLegSummary } from '@/lib/planned-session/brick/brick-sessions';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';
import { prefetchPlannedSessionDetail } from '@/lib/query/prefetch-planned-session-detail';
import { useAppModal } from '@/providers/app-modal-provider';

/**
 * One brick, one bubble, on the thread.
 *
 * A brick is a single prescription split across sports — showing its legs as two
 * unrelated thread rows said nothing about the enchaînement that is the point of
 * planning it as a brick. This renders both legs behind one dropdown; opening a
 * leg still lands on its own dialog for the sport-specific detail.
 */
export function ThreadBrickRow({
  entries,
  isPivot = false,
  expanded = false,
}: {
  entries: ThreadEntry[];
  isPivot?: boolean;
  expanded?: boolean;
}) {
  const queryClient = useQueryClient();
  const { openPlannedSession } = useAppModal();

  const legs: BrickLegSummary[] = entries
    .filter((e): e is ThreadEntry & { planned: NonNullable<ThreadEntry['planned']> } =>
      Boolean(e.planned),
    )
    .map((e) => ({
      id: e.planned.id,
      type: e.planned.type,
      title: e.planned.title?.trim() || activityTypeLabels[e.planned.type],
      durationMin: e.planned.durationMin,
      intensity: e.planned.intensity,
      // A leg surfaces as `paired` once realized — the summary embedded on the
      // activity doesn't carry `completed`/`activityId`, so read them off the entry.
      completed: e.kind !== 'planned',
      activityId: e.activity?.id ?? null,
    }));

  if (legs.length === 0) return null;

  const totalMin = legs.reduce((sum, l) => sum + (l.durationMin ?? 0), 0);
  const subtitle = totalMin > 0 ? `${totalMin} min` : null;
  const brickGroupId = entries.find((e) => e.planned?.brickGroupId)?.planned?.brickGroupId ?? '';

  return (
    <div onPointerEnter={() => prefetchPlannedSessionDetail(queryClient, legs[0]!.id)}>
      <BrickOverviewCard
        badge={isPivot ? 'Point de bascule' : null}
        brickGroupId={brickGroupId}
        defaultExpanded={expanded}
        legs={legs}
        subtitle={subtitle}
        onOpenLeg={(legId) => openPlannedSession({ sessionId: legId })}
      />
    </div>
  );
}

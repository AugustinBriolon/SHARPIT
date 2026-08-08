'use client';

import type { ReactNode } from 'react';
import { ActivityType } from '@prisma/client';
import { Link2Off } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { InstrumentListChip } from '@/components/ui/instrument-list-chip';
import { useHikeTripMutations } from '@/hooks/use-data';
import { formatDate, formatDistance, formatDuration } from '@/lib/format';
import type { ClientHikeTrip } from '@/lib/query/types';
import { cn } from '@/lib/utils';

export type HikeTripMember = ClientHikeTrip['activities'][number];

export function buildHikeTripMemberMeta(member: HikeTripMember): string[] {
  const meta: string[] = [formatDate(member.date)];

  const distanceM = member.hikeMetrics?.distanceM;
  if (distanceM != null && distanceM > 0) {
    meta.push(formatDistance(distanceM));
  }

  const elevationM = member.hikeMetrics?.elevationM;
  if (elevationM != null && elevationM > 0) {
    meta.push(`D+ ${Math.round(elevationM)} m`);
  }

  if (member.duration != null && member.duration > 0) {
    meta.push(formatDuration(member.duration));
  }

  return meta;
}

export function HikeTripTimelineList({
  members,
  renderTrailing,
}: {
  members: HikeTripMember[];
  renderTrailing?: (member: HikeTripMember) => ReactNode;
}) {
  if (members.length === 0) return null;

  return (
    <ul aria-label="Étapes du déplacement" className="space-y-2">
      {members.map((member) => (
        <li key={member.id} className="min-w-0">
          <InstrumentListChip
            activityType={ActivityType.HIKE}
            href={`/training/${member.id}`}
            meta={buildHikeTripMemberMeta(member)}
            title={member.title?.trim() || 'Randonnée'}
            trailing={renderTrailing?.(member)}
            showArrow
          />
        </li>
      ))}
    </ul>
  );
}

function RemoveMemberButton({ disabled, onRemove }: { disabled: boolean; onRemove: () => void }) {
  return (
    <Button
      aria-label="Retirer du déplacement"
      className={cn('text-muted-foreground size-8 shrink-0', disabled && 'opacity-40')}
      disabled={disabled}
      size="icon-sm"
      title={disabled ? 'Ajoute une étape ou supprime le déplacement' : 'Retirer du déplacement'}
      type="button"
      variant="ghost"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!disabled) onRemove();
      }}
    >
      <Link2Off className="size-3.5" aria-hidden />
    </Button>
  );
}

export function HikeTripTimeline({
  tripId,
  members,
}: {
  tripId: string;
  members: HikeTripMember[];
}) {
  const router = useRouter();
  const { patch } = useHikeTripMutations();
  const { confirm, dialog } = useConfirmDialog();
  const soleMember = members.length <= 1;

  async function handleRemove(member: HikeTripMember) {
    const confirmed = await confirm({
      title: 'Retirer cette étape ?',
      description: `« ${member.title?.trim() || 'Randonnée'} » ne fera plus partie du déplacement.`,
      confirmLabel: 'Retirer',
    });
    if (!confirmed) return;

    patch.mutate(
      { id: tripId, data: { removeActivityIds: [member.id] } },
      { onSuccess: () => router.refresh() },
    );
  }

  return (
    <>
      <HikeTripTimelineList
        members={members}
        renderTrailing={(member) => (
          <RemoveMemberButton disabled={soleMember} onRemove={() => void handleRemove(member)} />
        )}
      />
      {dialog}
    </>
  );
}

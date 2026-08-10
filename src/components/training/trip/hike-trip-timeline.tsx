'use client';

import type { ReactNode } from 'react';
import { Link2Off } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { HikeStepSparkline } from '@/components/training/trip/hike-trip-elevation-profile';
import { useHikeTripMutations } from '@/hooks/use-data';
import { buildHikeStepSparkline } from '@/lib/activity/hike-trip-elevation';
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

/** Step index marker — the timeline's rail node on mobile, inline on desktop. */
function StepBadge({ index }: { index: number }) {
  return (
    <span
      className={cn(
        'bg-highlight text-highlight-foreground text-data absolute top-3 left-0 z-10 flex size-6 shrink-0',
        'items-center justify-center rounded-full text-[11px] font-semibold',
        'lg:static lg:mt-3',
      )}
    >
      {index + 1}
    </span>
  );
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
    <ol
      aria-label="Étapes du séjour"
      className="space-y-2 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0"
    >
      {members.map((member, index) => {
        const sparkline = buildHikeStepSparkline(member);
        const meta = buildHikeTripMemberMeta(member);

        return (
          <li
            key={member.id}
            className={cn(
              'relative min-w-0 pl-9 lg:flex lg:items-start lg:gap-3 lg:pl-0',
              // Rail connector between consecutive steps (mobile only).
              'not-last:after:bg-analysis-border not-last:after:absolute not-last:after:top-9',
              'not-last:after:bottom-[-0.5rem] not-last:after:left-3 not-last:after:w-px',
              'lg:not-last:after:hidden',
            )}
          >
            <StepBadge index={index} />
            <Link
              href={`/training/${member.id}`}
              title={`Voir le détail — ${member.title?.trim() || 'Randonnée'}`}
              className={cn(
                'chip-surface-lg group focus-visible:ring-primary/35 flex min-w-0 flex-1 items-center',
                'gap-3 rounded-[14px] px-3 py-3 text-left focus-visible:ring-2 focus-visible:outline-hidden',
              )}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-foreground line-clamp-1 min-w-0 text-sm leading-snug font-medium">
                  {member.title?.trim() || 'Randonnée'}
                </span>
                {/* Wraps rather than truncating: four facts do not fit one 390px line. */}
                <span className="text-muted-foreground text-data flex min-w-0 flex-wrap items-center gap-x-1.5 text-xs">
                  {meta.map((item, metaIndex) => (
                    <span key={`${member.id}-meta-${metaIndex}`} className="contents">
                      {metaIndex > 0 ? (
                        <span className="shrink-0 opacity-30" aria-hidden>
                          ·
                        </span>
                      ) : null}
                      <span className="whitespace-nowrap">{item}</span>
                    </span>
                  ))}
                </span>
              </span>
              {sparkline ? <HikeStepSparkline points={sparkline} /> : null}
              {renderTrailing?.(member)}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

export function RemoveMemberButton({
  disabled,
  onRemove,
}: {
  disabled: boolean;
  onRemove: () => void;
}) {
  const disabledTooltip = 'Ajoute une étape ou supprime le séjour';
  const enabledTooltip = 'Retirer du séjour';

  const button = (
    <Button
      aria-label="Retirer du séjour"
      className={cn('text-muted-foreground size-8 shrink-0', disabled && 'opacity-40')}
      disabled={disabled}
      size="icon-sm"
      title={disabled ? undefined : enabledTooltip}
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

  if (disabled) {
    return (
      <span className="inline-flex shrink-0" title={disabledTooltip}>
        {button}
      </span>
    );
  }

  return button;
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
      description: `« ${member.title?.trim() || 'Randonnée'} » ne fera plus partie du séjour.`,
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

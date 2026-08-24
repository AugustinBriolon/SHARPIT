'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ActivityType } from '@prisma/client';
import { Link2, MoreHorizontal, Mountain, Pencil, Trash2 } from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { ExpertModeBadge } from '@/components/display-mode';
import { DiscussCoachLink } from './discuss-coach-link';
import { LinkHikeActivitiesSheet } from '@/components/training/trip/link-hike-activities-sheet';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useActivityMutations } from '@/hooks/use-data';
import { useResetWhenHidden } from '@/hooks/use-reset-when-hidden';
import { activityTypeLabels } from '@/lib/format';
import {
  formatActivityDetailMeta,
  formatActivityDetailStats,
  sportIcon,
} from './activity-detail-helpers';
import type { ActivityDetail } from './types';
import { useDisplayMode } from '@/providers/display-mode-provider';

/** Narrow client payload — avoid serializing full activityInclude to this island. */
export type ActivityDetailHeaderActivity = Pick<
  ActivityDetail,
  | 'id'
  | 'type'
  | 'title'
  | 'date'
  | 'source'
  | 'garminId'
  | 'stravaId'
  | 'duration'
  | 'load'
  | 'rpe'
  | 'hikeTrip'
  | 'plannedSession'
>;

/**
 * Activity detail header — icon + meta → title → durée · charge/TSS · RPE.
 * One primary CTA (coach) + overflow for edit/delete.
 */
export function ActivityDetailHeader({ activity }: { activity: ActivityDetailHeaderActivity }) {
  const router = useRouter();
  const { mode } = useDisplayMode();
  const { remove } = useActivityMutations();
  const { confirm, dialog } = useConfirmDialog();
  const [linkHikesOpen, setLinkHikesOpen] = useState(false);

  useResetWhenHidden(() => setLinkHikesOpen(false));
  const editHref = `/training/${activity.id}/edit`;
  const Icon = sportIcon[activity.type];
  const isHike = activity.type === ActivityType.HIKE;
  const hikeTrip = isHike ? activity.hikeTrip : null;

  async function handleDelete() {
    const confirmed = await confirm({
      title: 'Supprimer cette séance ?',
      description: 'Cette action est définitive.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (!confirmed) return;
    remove.mutate(activity.id);
    router.push('/training');
  }

  const actionsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Actions de la séance"
            className="text-muted-foreground"
            size="icon-sm"
            type="button"
            variant="ghost"
          />
        }
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          nativeButton={false}
          render={<Link href={editHref} />}
        >
          <Pencil className="size-3.5" aria-hidden />
          Modifier
        </DropdownMenuItem>
        {isHike && !hikeTrip ? (
          <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => setLinkHikesOpen(true)}>
            <Link2 className="size-3.5" aria-hidden />
            Lier à d&apos;autres randonnées
          </DropdownMenuItem>
        ) : null}
        {hikeTrip ? (
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            nativeButton={false}
            render={<Link href={`/training/trips/${hikeTrip.id}`} />}
          >
            <Mountain className="size-3.5" aria-hidden />
            Voir le séjour
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          variant="destructive"
          onClick={() => void handleDelete()}
        >
          <Trash2 className="size-3.5" aria-hidden />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <StickyHeader>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="icon-well size-11 sm:size-12" aria-hidden>
            <Icon className="size-5 sm:size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="text-muted-foreground text-sm tracking-wide">
                {formatActivityDetailMeta(activity)}
              </p>
              <ExpertModeBadge />
            </div>
            <h1 className="text-page-title mt-1.5 leading-snug wrap-break-word">
              {activity.title ?? activityTypeLabels[activity.type]}
            </h1>
            <p className="text-data text-muted-foreground mt-1.5 text-sm tabular-nums">
              {formatActivityDetailStats(activity, mode)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-1 sm:gap-1.5">
          <DiscussCoachLink
            activityId={activity.id}
            plannedSessionId={activity.plannedSession?.id}
          />
          {actionsMenu}
        </div>
      </div>
      {dialog}
      {isHike && !hikeTrip ? (
        <LinkHikeActivitiesSheet
          open={linkHikesOpen}
          seedActivityId={activity.id}
          onOpenChange={setLinkHikesOpen}
        />
      ) : null}
    </StickyHeader>
  );
}

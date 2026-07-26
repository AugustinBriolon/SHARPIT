'use client';

import { useRouter } from 'next/navigation';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { DiscussCoachLink } from '@/components/training/activity/discuss-coach-link';
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
import { activityTypeLabels } from '@/lib/format';
import {
  formatActivityDetailMeta,
  formatActivityDetailStats,
  sportIcon,
} from './activity-detail-helpers';
import type { ActivityDetail } from './types';

/**
 * Activity detail header — icon + meta → title → durée · TSS · RPE.
 * One primary CTA (coach) + overflow for edit/delete.
 */
export function ActivityDetailHeader({ activity }: { activity: ActivityDetail }) {
  const router = useRouter();
  const { remove } = useActivityMutations();
  const { confirm, dialog } = useConfirmDialog();
  const editHref = `/training/${activity.id}/edit`;
  const Icon = sportIcon[activity.type];

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
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push(editHref)}>
          <Pencil className="size-3.5" />
          Modifier
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          variant="destructive"
          onClick={() => void handleDelete()}
        >
          <Trash2 className="size-3.5" />
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
            <p className="text-muted-foreground text-sm tracking-wide">
              {formatActivityDetailMeta(activity)}
            </p>
            <h1 className="text-page-title mt-1.5 leading-snug">
              {activity.title ?? activityTypeLabels[activity.type]}
            </h1>
            <p className="text-data text-muted-foreground mt-1.5 text-sm tabular-nums">
              {formatActivityDetailStats(activity)}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-start gap-1.5 sm:gap-2">
          <DiscussCoachLink
            activityId={activity.id}
            plannedSessionId={activity.plannedSession?.id}
          />
          {actionsMenu}
        </div>
      </div>
      {dialog}
    </StickyHeader>
  );
}

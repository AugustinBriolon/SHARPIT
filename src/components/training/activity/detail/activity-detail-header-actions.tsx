'use client';

import Link from 'next/link';
import { ActivityType } from '@prisma/client';
import { Link2, MoreHorizontal, Mountain, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { floatingHeaderButtonClass } from '@/components/layout/floating-header-button';
import { cn } from '@/lib/utils';
import type { ActivityDetailHeaderActivity } from '@/components/training/activity/detail/activity-detail-header';

export function ActivityDetailActionsMenu({
  activity,
  editHref,
  hikeTrip,
  isHike,
  onDelete,
  onLinkHikes,
}: {
  activity: ActivityDetailHeaderActivity;
  editHref: string;
  hikeTrip: ActivityDetailHeaderActivity['hikeTrip'];
  isHike: boolean;
  onDelete: () => void;
  onLinkHikes: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Actions de la séance"
            className={cn(
              floatingHeaderButtonClass('right'),
              'lg:text-muted-foreground lg:hover:bg-muted lg:hover:text-foreground',
            )}
            size="icon-sm"
            type="button"
            variant="ghost"
          />
        }
      >
        <MoreHorizontal className="size-5 lg:size-4" aria-hidden />
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
          <DropdownMenuItem className="cursor-pointer gap-2" onClick={onLinkHikes}>
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
        <DropdownMenuItem className="cursor-pointer gap-2" variant="destructive" onClick={onDelete}>
          <Trash2 className="size-3.5" aria-hidden />
          Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

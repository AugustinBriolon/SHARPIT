'use client';

import { Drawer } from '@base-ui/react/drawer';
import { ActivityType } from '@prisma/client';
import { MoreHorizontal, Mountain, Pencil, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { Button } from '@/components/ui/button';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { InstrumentListChip } from '@/components/ui/instrument-list-chip';
import { Input } from '@/components/ui/input';
import { useActivities, useHikeTripMutations } from '@/hooks/use-data';
import { buildHikeTripMemberMeta } from '@/components/training/trip/hike-trip-timeline';
import { formatDate } from '@/lib/format';
import { SPORT_IDENTITY_TEXT } from '@/lib/activity/sport-identity';
import type { HikeTripSummary } from '@/lib/activity/hike-trip-summary';
import { cn } from '@/lib/utils';

function formatTripDateRange(start: Date, end: Date): string {
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function HikeTripPageHeader({
  name,
  summary,
  tripId,
}: {
  name: string;
  summary: HikeTripSummary;
  tripId: string;
}) {
  return (
    <StickyHeader>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="icon-well size-11 sm:size-12" aria-hidden>
            <Mountain className={cn('size-5 sm:size-6', SPORT_IDENTITY_TEXT[ActivityType.HIKE])} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground text-sm tracking-wide">Déplacement</p>
            <h1 className="text-page-title mt-1.5 leading-snug wrap-break-word">{name}</h1>
            <p className="text-data text-muted-foreground mt-1.5 text-sm tabular-nums">
              {formatTripDateRange(summary.startAt, summary.endAt)}
              {summary.memberCount > 0
                ? ` · ${summary.memberCount} étape${summary.memberCount > 1 ? 's' : ''}`
                : null}
            </p>
          </div>
        </div>
        <HikeTripHeaderMenu tripId={tripId} tripName={name} />
      </div>
    </StickyHeader>
  );
}

function HikeTripHeaderMenu({ tripId, tripName }: { tripId: string; tripName: string }) {
  const router = useRouter();
  const { patch, remove } = useHikeTripMutations();
  const { confirm, dialog } = useConfirmDialog();
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState(tripName);

  async function handleDelete() {
    const confirmed = await confirm({
      title: 'Supprimer ce déplacement ?',
      description: 'Les randonnées liées seront conservées et détachées du dossier.',
      confirmLabel: 'Supprimer',
      variant: 'destructive',
    });
    if (!confirmed) return;
    remove.mutate(tripId, {
      onSuccess: () => router.push('/training'),
    });
  }

  function handleRenameSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === tripName) {
      setRenameOpen(false);
      return;
    }
    patch.mutate(
      { id: tripId, data: { name: trimmed } },
      {
        onSuccess: () => {
          setRenameOpen(false);
          router.refresh();
        },
      },
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label="Actions du déplacement"
              className="text-muted-foreground"
              size="icon-sm"
              type="button"
              variant="ghost"
            />
          }
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem
            className="cursor-pointer gap-2"
            onClick={() => {
              setRenameValue(tripName);
              setRenameOpen(true);
            }}
          >
            <Pencil className="size-3.5" aria-hidden />
            Renommer
          </DropdownMenuItem>
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

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleRenameSubmit}>
            <DialogHeader>
              <DialogTitle>Renommer le déplacement</DialogTitle>
              <DialogDescription>Ex. « Queyras · août »</DialogDescription>
            </DialogHeader>
            <Input
              className="mt-4"
              value={renameValue}
              autoFocus
              onChange={(event) => setRenameValue(event.target.value)}
            />
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setRenameOpen(false)}>
                Annuler
              </Button>
              <Button disabled={!renameValue.trim()} type="submit">
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {dialog}
    </>
  );
}

export function HikeTripAddStepControl({ tripId }: { tripId: string }) {
  const router = useRouter();
  const { patch } = useHikeTripMutations();
  const { data: activities, isPending } = useActivities();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const availableHikes = useMemo(
    () =>
      (activities ?? []).filter(
        (activity) => activity.type === ActivityType.HIKE && activity.hikeTripId == null,
      ),
    [activities],
  );

  function handleAdd() {
    if (!selectedId) return;
    patch.mutate(
      { id: tripId, data: { addActivityIds: [selectedId] } },
      {
        onSuccess: () => {
          setOpen(false);
          setSelectedId(null);
          router.refresh();
        },
      },
    );
  }

  return (
    <>
      <Button size="sm" type="button" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" aria-hidden />
        Ajouter une étape
      </Button>

      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Backdrop
            className={cn(
              'bg-foreground/40 fixed inset-0 z-60',
              'transition-opacity duration-250 ease-out',
              'data-closed:opacity-0 data-closed:duration-150',
            )}
          />
          <Drawer.Viewport className="fixed inset-0 z-61 flex flex-col justify-end">
            <Drawer.Popup
              className={cn(
                'bg-background flex max-h-[92dvh] flex-col rounded-t-2xl',
                'transition-transform duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]',
                'starting:translate-y-full',
                'data-closed:translate-y-full data-closed:duration-150 data-closed:ease-out',
              )}
            >
              <div className="border-border/60 flex items-center justify-between border-b px-4 py-3">
                <Drawer.Title className="text-section-title">Ajouter une étape</Drawer.Title>
                <Drawer.Close
                  render={
                    <Button aria-label="Fermer" size="icon-sm" type="button" variant="ghost" />
                  }
                >
                  ×
                </Drawer.Close>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                {isPending ? (
                  <p className="text-muted-foreground text-sm">Chargement…</p>
                ) : availableHikes.length === 0 ? (
                  <InkEmptyState
                    description="Lie des randonnées depuis Training ou crée-en de nouvelles."
                    icon={Mountain}
                    title="Aucune randonnée disponible"
                    bleed
                  />
                ) : (
                  <ul className="space-y-2">
                    {availableHikes.map((activity) => {
                      const selected = selectedId === activity.id;
                      return (
                        <li key={activity.id}>
                          <InstrumentListChip
                            activityType={ActivityType.HIKE}
                            className={cn(selected && 'ring-primary/40 ring-2')}
                            showArrow={false}
                            title={activity.title?.trim() || 'Randonnée'}
                            meta={buildHikeTripMemberMeta({
                              ...activity,
                              observedLocationLabel: null,
                              hikeMetrics: activity.hikeMetrics
                                ? {
                                    distanceM: activity.hikeMetrics.distanceM ?? null,
                                    elevationM: activity.hikeMetrics.elevationM ?? null,
                                    elevationLossM: null,
                                  }
                                : null,
                            })}
                            onClick={() => setSelectedId(selected ? null : activity.id)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="border-border/60 border-t px-4 py-3">
                <Button
                  className="w-full"
                  disabled={!selectedId || patch.isPending}
                  type="button"
                  onClick={handleAdd}
                >
                  Ajouter au déplacement
                </Button>
              </div>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

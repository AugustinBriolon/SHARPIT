'use client';

import { ActivityType } from '@prisma/client';
import { Drawer } from '@base-ui/react/drawer';
import { useMemo, useState } from 'react';
import { CreateHikeTripDialog } from '@/components/training/trip/create-hike-trip-dialog';
import {
  LinkHikeOtherActivities,
  LinkHikeSeedActivity,
} from '@/components/training/trip/link-hike-activities-sheet-parts';
import { Button } from '@/components/ui/button';
import { useActivities } from '@/hooks/use-data';
import { cn } from '@/lib/utils';

type LinkHikeActivitiesSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seedActivityId: string;
  onCreated?: () => void;
};

export function LinkHikeActivitiesSheet({
  open,
  onOpenChange,
  seedActivityId,
  onCreated,
}: LinkHikeActivitiesSheetProps) {
  const { data: activities, isPending } = useActivities();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [createOpen, setCreateOpen] = useState(false);

  const seed = useMemo(
    () => (activities ?? []).find((activity) => activity.id === seedActivityId) ?? null,
    [activities, seedActivityId],
  );

  const availableOthers = useMemo(
    () =>
      (activities ?? []).filter(
        (activity) =>
          activity.id !== seedActivityId &&
          activity.type === ActivityType.HIKE &&
          activity.hikeTripId === null,
      ),
    [activities, seedActivityId],
  );

  const activityIds = useMemo(
    () => [seedActivityId, ...selectedIds],
    [seedActivityId, selectedIds],
  );

  function toggleOther(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setSelectedIds(new Set());
      setCreateOpen(false);
    }
    onOpenChange(next);
  }

  const canContinue = selectedIds.size >= 1;

  return (
    <>
      <Drawer.Root open={open} onOpenChange={handleOpenChange}>
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
                <Drawer.Title className="text-section-title">
                  Lier à d&apos;autres randonnées
                </Drawer.Title>
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
                ) : (
                  <div className="space-y-4">
                    {seed ? <LinkHikeSeedActivity seed={seed} /> : null}
                    <LinkHikeOtherActivities
                      activities={availableOthers}
                      selectedIds={selectedIds}
                      onToggle={toggleOther}
                    />
                  </div>
                )}
              </div>

              <div className="border-border/60 safe-area-bottom space-y-2 border-t px-4 py-3">
                {!canContinue ? (
                  <p className="text-muted-foreground text-center text-xs">
                    Sélectionne au moins une autre randonnée.
                  </p>
                ) : null}
                <Button
                  className="w-full"
                  disabled={!canContinue}
                  type="button"
                  onClick={() => setCreateOpen(true)}
                >
                  Continuer ({activityIds.length})
                </Button>
              </div>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>

      <CreateHikeTripDialog
        activityIds={activityIds}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          handleOpenChange(false);
          onCreated?.();
        }}
      />
    </>
  );
}

'use client';

import { type TrainingHistoryFilters } from '@/lib/training/history-filters';
import { cn } from '@/lib/utils';
import { Drawer } from '@base-ui/react/drawer';
import { ActivityType } from '@prisma/client';
import { X } from 'lucide-react';
import { FilterDrawerBody } from './mobile-filter-drawer-parts';

function FilterDrawerShell({
  filters,
  counts,
  onApply,
  onToggleType,
}: {
  filters: TrainingHistoryFilters;
  counts: Record<ActivityType, number>;
  onApply: (next: TrainingHistoryFilters) => void;
  onToggleType: (type: ActivityType) => void;
}) {
  return (
    <Drawer.Popup
      id="history-filter-drawer"
      className={cn(
        'bg-background flex max-h-[92dvh] flex-col rounded-t-2xl',
        'transition-transform duration-250 ease-[cubic-bezier(0.32,0.72,0,1)]',
        'starting:translate-y-full',
        'data-closed:translate-y-full data-closed:duration-150 data-closed:ease-out',
      )}
    >
      <div className="flex justify-center pt-3 pb-1" aria-hidden>
        <div className="bg-foreground/20 h-1 w-10 rounded-full" />
      </div>

      <div className="border-foreground/8 flex items-center justify-between border-b px-4 pb-3">
        <Drawer.Title className="text-sm font-semibold">Filtres</Drawer.Title>
        <Drawer.Close
          render={
            <button
              aria-label="Fermer"
              className="text-muted-foreground hover:text-foreground pressable inline-flex size-11 items-center justify-center rounded-lg"
              type="button"
            >
              <X className="size-4" aria-hidden />
            </button>
          }
        />
      </div>

      <FilterDrawerBody
        counts={counts}
        filters={filters}
        onApply={onApply}
        onToggleType={onToggleType}
      />
    </Drawer.Popup>
  );
}

export function MobileFilterDrawer({
  open,
  filters,
  counts,
  onApply,
  onOpenChange,
}: {
  open: boolean;
  filters: TrainingHistoryFilters;
  counts: Record<ActivityType, number>;
  onApply: (next: TrainingHistoryFilters) => void;
  onOpenChange: (open: boolean) => void;
}) {
  function toggleType(type: ActivityType) {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onApply({
      ...filters,
      types: next,
      distanceMinKm: null,
      distanceMaxKm: null,
    });
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Backdrop
          className={cn(
            'bg-foreground/40 fixed inset-0 z-60',
            'transition-opacity duration-250 ease-out',
            'data-closed:opacity-0 data-closed:duration-150',
          )}
        />
        <Drawer.Viewport className="fixed inset-0 z-61 flex flex-col justify-end">
          <FilterDrawerShell
            counts={counts}
            filters={filters}
            onApply={onApply}
            onToggleType={toggleType}
          />
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

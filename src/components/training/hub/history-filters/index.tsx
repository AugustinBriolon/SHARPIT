'use client';

import { ActivityType } from '@prisma/client';
import { SlidersHorizontal, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  countActiveTrainingHistoryFilters,
  DEFAULT_TRAINING_HISTORY_FILTERS,
  type TrainingHistoryFilters,
} from '@/lib/training/history-filters';
import { useIsMobile } from '@/hooks/use-viewport';
import { DesktopFilterMenu } from './desktop-filter-menu';
import { MobileFilterDrawer } from './mobile-filter-drawer';

export function HistoryFilters({
  filters,
  counts,
  onApply,
}: {
  filters: TrainingHistoryFilters;
  counts: Record<ActivityType, number>;
  onApply: (next: TrainingHistoryFilters) => void;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const activeCount = countActiveTrainingHistoryFilters(filters);
  const isActive = activeCount > 0;
  let ariaControls: string | undefined;
  if (open) ariaControls = isMobile ? 'history-filter-drawer' : 'history-filter-menu';

  return (
    <div className="flex items-center gap-2">
      {/* Trigger — anchors the desktop floating menu */}
      <div className="relative">
        <button
          aria-controls={ariaControls}
          aria-expanded={open}
          aria-haspopup={isMobile ? 'dialog' : 'true'}
          type="button"
          className={cn(
            'pressable inline-flex min-h-11 items-center gap-1.5 rounded-md px-2.5 py-2 text-sm lg:min-h-9 lg:py-1.5',
            isActive
              ? 'text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground',
          )}
          onClick={() => (isMobile ? setOpen(true) : setOpen((v) => !v))}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden />
          Filtres
          {isActive ? (
            <span className="text-highlight text-data text-xs font-bold">{activeCount}</span>
          ) : null}
        </button>

        {/* Desktop floating menu — anchored to the trigger */}
        {!isMobile && open ? (
          <DesktopFilterMenu
            counts={counts}
            filters={filters}
            onApply={onApply}
            onClose={() => setOpen(false)}
          />
        ) : null}
      </div>

      {/* Effacer button — appears next to trigger when filters active */}
      {isActive ? (
        <button
          aria-label="Effacer tous les filtres"
          className="text-muted-foreground hover:text-foreground pressable inline-flex min-h-11 items-center gap-1 px-2 text-xs lg:min-h-9"
          type="button"
          onClick={() => onApply(DEFAULT_TRAINING_HISTORY_FILTERS)}
        >
          <X className="size-3" aria-hidden />
          Effacer
        </button>
      ) : null}

      {/* Mobile drawer */}
      {isMobile ? (
        <MobileFilterDrawer
          counts={counts}
          filters={filters}
          open={open}
          onApply={onApply}
          onOpenChange={setOpen}
        />
      ) : null}
    </div>
  );
}

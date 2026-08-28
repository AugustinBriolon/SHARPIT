'use client';

import { ActivityType } from '@prisma/client';
import { X } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  countActiveTrainingHistoryFilters,
  DEFAULT_TRAINING_HISTORY_FILTERS,
  type TrainingHistoryFilters,
} from '@/lib/training/history-filters';
import { useIsMobile } from '@/hooks/use-viewport';
import { useResetWhenHidden } from '@/hooks/use-reset-when-hidden';
import { HistoryFilterTrigger } from '@/components/training/hub/history-filters/history-filter-trigger';

const DesktopFilterMenu = dynamic(
  () => import('./desktop-filter-menu').then((mod) => mod.DesktopFilterMenu),
  { ssr: false },
);
const MobileFilterDrawer = dynamic(
  () => import('./mobile-filter-drawer').then((mod) => mod.MobileFilterDrawer),
  { ssr: false },
);

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
  // The filter *values* are deliberate and stay; the panel being open is not.
  useResetWhenHidden(() => setOpen(false));
  const activeCount = countActiveTrainingHistoryFilters(filters);
  const isActive = activeCount > 0;
  const ariaControls = open
    ? isMobile
      ? 'history-filter-drawer'
      : 'history-filter-menu'
    : undefined;

  return (
    <div className="flex items-center gap-2">
      {/* Trigger — anchors the desktop floating menu */}
      <div className="relative">
        <HistoryFilterTrigger
          activeCount={activeCount}
          ariaControls={ariaControls}
          isActive={isActive}
          open={open}
          onClick={() => (isMobile ? setOpen(true) : setOpen((v) => !v))}
        />

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

      {/* Mobile drawer — only mount the mobile chunk on small viewports */}
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

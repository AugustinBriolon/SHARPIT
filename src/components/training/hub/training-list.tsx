'use client';

import { ActivityType } from '@prisma/client';
import { format, isSameWeek, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  TrainingListEmptyStates,
  TrainingListToolbar,
  TrainingListWeekGroups,
} from '@/components/training/hub/training-list-parts';
import type { ClientActivity } from '@/lib/query/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { InstrumentListChipSkeleton } from '@/components/ui/instruments/instrument-list-chip';
import { useActivities, useRecords } from '@/hooks/use-data';
import { useResetWhenHidden } from '@/hooks/use-reset-when-hidden';
import {
  DEFAULT_TRAINING_HISTORY_FILTERS,
  formatTrainingHistoryFilterStatus,
} from '@/lib/training/history-filters';
import { useTrainingListState } from '@/components/training/hub/use-training-list-state';
import { cn } from '@/lib/utils';
import { CalendarPlus, X } from 'lucide-react';

const CreateHikeTripDialog = dynamic(
  () =>
    import('@/components/training/trip/create-hike-trip-dialog').then(
      (mod) => mod.CreateHikeTripDialog,
    ),
  { ssr: false },
);

const FILTER_URL_DEBOUNCE_MS = 200;

/** Height reserved under the list so the last chips clear the fixed confirm bar. */
const SELECTION_BAR_SPACE = 'pb-28';

type WeekGroup = { key: string; label: string; activities: ClientActivity[] };

/** Group activities into ISO weeks (most recent first), each with a human label. */
function groupByWeek(activities: ClientActivity[]): WeekGroup[] {
  const today = new Date();
  const groups = new Map<string, WeekGroup>();

  for (const activity of activities) {
    const date = new Date(activity.date);
    const weekStart = startOfWeek(date, { locale: fr });
    const key = format(weekStart, 'yyyy-MM-dd');
    let group = groups.get(key);
    if (!group) {
      const label = isSameWeek(date, today, { locale: fr })
        ? 'Cette semaine'
        : `Semaine du ${format(weekStart, 'd MMMM', { locale: fr })}`;
      group = { key, label, activities: [] };
      groups.set(key, group);
    }
    group.activities.push(activity);
  }

  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key));
}

export function TrainingListFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-11 w-full rounded-xl lg:h-9 lg:max-w-xl lg:rounded-full" />
      <section>
        <div className="mb-2 px-0.5">
          <SkeletonDataValue heightClassName="h-3" widthClassName="w-24" />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <InstrumentListChipSkeleton key={i} titleWidth="w-[min(100%,14rem)]" />
          ))}
        </div>
      </section>
    </div>
  );
}

function HikeSelectionConfirmBar({
  selectedCount,
  onConfirm,
}: {
  selectedCount: number;
  onConfirm: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  // Portal to body so fixed escapes the scroll shell. Width tracks the main column
  // (sidebar w-60 on lg) with the same horizontal gutters as AppShell content.
  return createPortal(
    <div
      aria-label="Confirmation de liaison"
      role="region"
      className={cn(
        'pointer-events-none fixed z-50',
        // Mobile: above tab bar · Desktop: bottom of viewport, inset past sidebar
        'inset-x-0 bottom-[var(--bottom-nav-offset)]',
        'lg:inset-x-auto lg:right-0 lg:bottom-0 lg:left-60',
      )}
    >
      <div
        className={cn(
          'pointer-events-auto mx-4 mb-3 lg:mx-6 lg:mb-6',
          'border-border/60 bg-background/95 supports-backdrop-filter:bg-background/80',
          'flex flex-col gap-2 rounded-xl border p-3 backdrop-blur-md',
          'sm:flex-row sm:items-center sm:justify-between',
        )}
      >
        <p className="text-muted-foreground min-w-0 text-sm">
          {selectedCount === 0
            ? 'Aucune randonnée sélectionnée'
            : `${selectedCount} randonnée${selectedCount > 1 ? 's' : ''} sélectionnée${selectedCount > 1 ? 's' : ''}`}
          {selectedCount > 0 && selectedCount < 2 ? ' — il en faut au moins 2' : null}
        </p>
        <Button
          className="w-full shrink-0 sm:w-auto"
          disabled={selectedCount < 2}
          type="button"
          onClick={onConfirm}
        >
          Créer un séjour
          {selectedCount >= 2 ? ` (${selectedCount})` : ''}
        </Button>
      </div>
    </div>,
    document.body,
  );
}

export function TrainingList() {
  const { data, isPending } = useActivities();
  const { data: records } = useRecords();
  const activities = data ?? [];

  const {
    counts,
    createDialogOpen,
    exitSelectionMode,
    filtered,
    filters,
    hasLinkableHikes,
    recordLabelsById,
    selectedIds,
    selectedIdsArray,
    selectionMode,
    setCreateDialogOpen,
    setFilters,
    toggleActivitySelection,
    toggleSelectionMode,
  } = useTrainingListState(activities, records);

  const weekGroups = useMemo(() => groupByWeek(filtered), [filtered]);

  if (isPending) {
    return <TrainingListFallback />;
  }

  return (
    <div className={cn('space-y-6', selectionMode && SELECTION_BAR_SPACE)}>
      <TrainingListToolbar
        counts={counts}
        filters={filters}
        hasLinkableHikes={hasLinkableHikes}
        selectionMode={selectionMode}
        onApplyFilters={setFilters}
        onExitSelectionMode={exitSelectionMode}
        onToggleSelectionMode={toggleSelectionMode}
      />
      <p aria-live="polite" className="sr-only" role="status">
        {activities.length === 0
          ? 'Aucune activité enregistrée.'
          : formatTrainingHistoryFilterStatus(filtered.length)}
      </p>
      <TrainingListEmptyStates
        activitiesCount={activities.length}
        weekGroupsCount={weekGroups.length}
        onClearFilters={() => setFilters(DEFAULT_TRAINING_HISTORY_FILTERS)}
      />
      <TrainingListWeekGroups
        recordLabelsById={recordLabelsById}
        selectedIds={selectedIds}
        selectionMode={selectionMode}
        weekGroups={weekGroups}
        onToggle={toggleActivitySelection}
      />

      {selectionMode ? (
        <HikeSelectionConfirmBar
          selectedCount={selectedIds.size}
          onConfirm={() => setCreateDialogOpen(true)}
        />
      ) : null}

      <CreateHikeTripDialog
        activityIds={selectedIdsArray}
        open={createDialogOpen}
        onCreated={exitSelectionMode}
        onOpenChange={setCreateDialogOpen}
      />
    </div>
  );
}

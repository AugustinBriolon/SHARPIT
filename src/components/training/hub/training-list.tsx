'use client';

import { format, isSameWeek, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
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
import {
  DEFAULT_TRAINING_HISTORY_FILTERS,
  formatTrainingHistoryFilterStatus,
} from '@/lib/training/history-filters';
import { useTrainingListState } from '@/components/training/hub/use-training-list-state';
import { PAGE_CONTENT_MAX_CLASS } from '@/lib/ui/page-gutter';
import { cn } from '@/lib/utils';

const CreateHikeTripDialog = dynamic(
  () =>
    import('@/components/training/trip/create-hike-trip-dialog').then(
      (mod) => mod.CreateHikeTripDialog,
    ),
  { ssr: false },
);

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

function hikeSelectionLabel(selectedCount: number): string {
  if (selectedCount === 0) {
    return 'Aucune randonnée sélectionnée';
  }
  const plural = selectedCount > 1 ? 's' : '';
  return `${selectedCount} randonnée${plural} sélectionnée${plural}`;
}

function HikeSelectionConfirmBarContent({
  selectedCount,
  onConfirm,
}: {
  selectedCount: number;
  onConfirm: () => void;
}) {
  return (
    <div
      className={cn(
        'border-border/60 bg-background/95 supports-backdrop-filter:bg-background/80',
        'flex flex-col gap-2 rounded-xl border p-3 backdrop-blur-md',
        'sm:flex-row sm:items-center sm:justify-between',
      )}
    >
      <p className="text-muted-foreground min-w-0 text-sm">
        {hikeSelectionLabel(selectedCount)}
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

  return createPortal(
    <div
      aria-label="Confirmation de liaison"
      className="pointer-events-none fixed inset-x-0 bottom-[var(--bottom-nav-offset)] z-50"
      role="region"
    >
      <div className={cn('pointer-events-auto mx-auto mb-3 px-4', PAGE_CONTENT_MAX_CLASS)}>
        <HikeSelectionConfirmBarContent selectedCount={selectedCount} onConfirm={onConfirm} />
      </div>
    </div>,
    document.body,
  );
}

type TrainingListContentProps = {
  activities: ClientActivity[];
  filteredCount: number;
  weekGroups: WeekGroup[];
  counts: ReturnType<typeof useTrainingListState>['counts'];
  filters: ReturnType<typeof useTrainingListState>['filters'];
  hasLinkableHikes: boolean;
  selectionMode: boolean;
  recordLabelsById: ReturnType<typeof useTrainingListState>['recordLabelsById'];
  selectedIds: ReturnType<typeof useTrainingListState>['selectedIds'];
  selectedIdsArray: string[];
  createDialogOpen: boolean;
  setCreateDialogOpen: (open: boolean) => void;
  setFilters: ReturnType<typeof useTrainingListState>['setFilters'];
  exitSelectionMode: () => void;
  toggleSelectionMode: () => void;
  toggleActivitySelection: ReturnType<typeof useTrainingListState>['toggleActivitySelection'];
};

function TrainingListMain({
  activities,
  filteredCount,
  weekGroups,
  counts,
  filters,
  hasLinkableHikes,
  selectionMode,
  recordLabelsById,
  selectedIds,
  setFilters,
  exitSelectionMode,
  toggleSelectionMode,
  toggleActivitySelection,
}: TrainingListContentProps) {
  return (
    <>
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
          : formatTrainingHistoryFilterStatus(filteredCount)}
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
    </>
  );
}

function TrainingListOverlays({
  selectionMode,
  selectedIds,
  selectedIdsArray,
  createDialogOpen,
  setCreateDialogOpen,
  exitSelectionMode,
}: Pick<
  TrainingListContentProps,
  | 'selectionMode'
  | 'selectedIds'
  | 'selectedIdsArray'
  | 'createDialogOpen'
  | 'setCreateDialogOpen'
  | 'exitSelectionMode'
>) {
  return (
    <>
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
    </>
  );
}

function TrainingListContent(props: TrainingListContentProps) {
  return (
    <div className={cn('space-y-6', props.selectionMode && SELECTION_BAR_SPACE)}>
      <TrainingListMain {...props} />
      <TrainingListOverlays
        createDialogOpen={props.createDialogOpen}
        exitSelectionMode={props.exitSelectionMode}
        selectedIds={props.selectedIds}
        selectedIdsArray={props.selectedIdsArray}
        selectionMode={props.selectionMode}
        setCreateDialogOpen={props.setCreateDialogOpen}
      />
    </div>
  );
}

export function TrainingList() {
  const { data, isPending } = useActivities();
  const { data: records } = useRecords();
  const activities = data ?? [];

  const listState = useTrainingListState(activities, records);
  const weekGroups = useMemo(() => groupByWeek(listState.filtered), [listState.filtered]);

  if (isPending) {
    return <TrainingListFallback />;
  }

  return (
    <TrainingListContent
      activities={activities}
      counts={listState.counts}
      createDialogOpen={listState.createDialogOpen}
      exitSelectionMode={listState.exitSelectionMode}
      filteredCount={listState.filtered.length}
      filters={listState.filters}
      hasLinkableHikes={listState.hasLinkableHikes}
      recordLabelsById={listState.recordLabelsById}
      selectedIds={listState.selectedIds}
      selectedIdsArray={listState.selectedIdsArray}
      selectionMode={listState.selectionMode}
      setCreateDialogOpen={listState.setCreateDialogOpen}
      setFilters={listState.setFilters}
      toggleActivitySelection={listState.toggleActivitySelection}
      toggleSelectionMode={listState.toggleSelectionMode}
      weekGroups={weekGroups}
    />
  );
}

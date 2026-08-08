'use client';

import { ActivityType } from '@prisma/client';
import { format, isSameWeek, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { ActivityList } from '@/components/training/activity/activity-list';
import { CreateHikeTripDialog } from '@/components/training/trip/create-hike-trip-dialog';
import { HistoryFilters } from '@/components/training/hub/history-filters';
import type { ClientActivity } from '@/lib/query/types';
import { Button } from '@/components/ui/button';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { LinkButton } from '@/components/ui/link-button';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { InstrumentListChipSkeleton } from '@/components/ui/instrument-list-chip';
import { useActivities, useRecords } from '@/hooks/use-data';
import {
  applyTrainingHistoryFilters,
  DEFAULT_TRAINING_HISTORY_FILTERS,
  formatTrainingHistoryFilterStatus,
  parseTrainingHistoryFilters,
  serializeTrainingHistoryFilters,
  type TrainingHistoryFilters,
} from '@/lib/training/history-filters';
import { buildActivityRecordLabels } from '@/lib/training/activity-record-labels';
import { cn } from '@/lib/utils';
import { CalendarPlus, FilterX, Link2, X } from 'lucide-react';

const TYPE_ORDER: ActivityType[] = [
  ActivityType.RUN,
  ActivityType.BIKE,
  ActivityType.SWIM,
  ActivityType.STRENGTH,
  ActivityType.TRIATHLON,
  ActivityType.HIKE,
  ActivityType.OTHER,
];

const FILTER_URL_DEBOUNCE_MS = 200;

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

export function TrainingList() {
  const { data, isPending } = useActivities();
  const { data: records } = useRecords();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const urlSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activities = data ?? [];
  const urlFilters = useMemo(
    () => parseTrainingHistoryFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const [optimisticFilters, setOptimisticFilters] = useState<TrainingHistoryFilters | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const filters = optimisticFilters ?? urlFilters;

  // Drop optimistic overlay when URL catches up (debounce) or browser history navigates.
  useEffect(() => {
    setOptimisticFilters(null);
  }, [urlFilters]);

  useEffect(() => {
    return () => {
      if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current);
    };
  }, []);

  const baseFilters = useMemo(() => ({ ...filters, types: [] }), [filters]);

  const activitiesMatchingNonTypeFilters = useMemo(
    () => applyTrainingHistoryFilters(activities, baseFilters),
    [activities, baseFilters],
  );

  const counts = useMemo(() => {
    const next = Object.fromEntries(TYPE_ORDER.map((t) => [t, 0])) as Record<ActivityType, number>;
    for (const activity of activitiesMatchingNonTypeFilters) {
      next[activity.type] += 1;
    }
    return next;
  }, [activitiesMatchingNonTypeFilters]);

  const filtered = useMemo(
    () => applyTrainingHistoryFilters(activities, filters),
    [activities, filters],
  );

  const weekGroups = useMemo(() => groupByWeek(filtered), [filtered]);

  const hasLinkableHikes = useMemo(
    () =>
      filtered.some(
        (activity) => activity.type === ActivityType.HIKE && activity.hikeTripId == null,
      ),
    [filtered],
  );

  const selectedIdsArray = useMemo(() => [...selectedIds], [selectedIds]);

  function toggleSelectionMode() {
    setSelectionMode((active) => {
      if (active) setSelectedIds(new Set());
      return !active;
    });
  }

  function toggleActivitySelection(activityId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(activityId)) next.delete(activityId);
      else next.add(activityId);
      return next;
    });
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setCreateDialogOpen(false);
  }

  const recordLabelsById = useMemo(() => buildActivityRecordLabels(records), [records]);

  function setFilters(nextFilters: TrainingHistoryFilters) {
    setOptimisticFilters(nextFilters);
    if (urlSyncTimerRef.current) clearTimeout(urlSyncTimerRef.current);
    urlSyncTimerRef.current = setTimeout(() => {
      startTransition(() => {
        const query = serializeTrainingHistoryFilters(nextFilters).toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    }, FILTER_URL_DEBOUNCE_MS);
  }

  if (isPending) {
    return <TrainingListFallback />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <HistoryFilters counts={counts} filters={filters} onApply={setFilters} />
        </div>
        {hasLinkableHikes ? (
          <Button
            size="sm"
            type="button"
            variant={selectionMode ? 'secondary' : 'outline'}
            onClick={toggleSelectionMode}
          >
            {selectionMode ? (
              <>
                <X className="size-3.5" aria-hidden />
                Annuler
              </>
            ) : (
              <>
                <Link2 className="size-3.5" aria-hidden />
                Lier des randonnées
              </>
            )}
          </Button>
        ) : null}
      </div>
      <p aria-live="polite" className="sr-only" role="status">
        {activities.length === 0
          ? 'Aucune activité enregistrée.'
          : formatTrainingHistoryFilterStatus(filtered.length)}
      </p>
      {weekGroups.length === 0 && activities.length === 0 ? (
        <InkEmptyState
          description="Connecte une source ou ajoute une séance manuelle pour construire l’historique."
          title="Aucune activité enregistrée"
          action={
            <LinkButton href="/training/manual" size="sm" variant="outline">
              <CalendarPlus className="size-3.5" aria-hidden />
              Saisir une activité
            </LinkButton>
          }
        />
      ) : null}
      {weekGroups.length === 0 && activities.length > 0 ? (
        <InkEmptyState
          description="Élargis ou réinitialise les filtres pour revoir l’historique."
          title="Aucun résultat pour ces filtres"
          action={
            <Button
              size="sm"
              type="button"
              variant="outline"
              onClick={() => setFilters(DEFAULT_TRAINING_HISTORY_FILTERS)}
            >
              <FilterX className="size-3.5" aria-hidden />
              Effacer les filtres
            </Button>
          }
        />
      ) : null}
      {weekGroups.length > 0
        ? weekGroups.map((group) => (
            <section key={group.key}>
              <p className="text-label mb-2 px-0.5">{group.label}</p>
              <ActivityList
                activities={group.activities}
                chipListClassName="sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0"
                recordLabelsById={recordLabelsById}
                selectedIds={selectedIds}
                selectionMode={selectionMode}
                variant="chip"
                onToggle={toggleActivitySelection}
              />
            </section>
          ))
        : null}

      {selectionMode && selectedIds.size >= 2 ? (
        <div
          className={cn(
            'border-border/60 bg-background/95 supports-backdrop-filter:bg-background/80',
            'fixed inset-x-0 bottom-0 z-40 border-t p-4 backdrop-blur-md',
            'lg:static lg:rounded-xl lg:border lg:p-3',
          )}
        >
          <Button
            className="w-full sm:w-auto"
            type="button"
            onClick={() => setCreateDialogOpen(true)}
          >
            Créer un déplacement ({selectedIds.size})
          </Button>
        </div>
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

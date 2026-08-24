'use client';

import { ActivityType } from '@prisma/client';
import { format, isSameWeek, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { ActivityList } from '@/components/training/activity/list/activity-list';
import { HistoryFilters } from '@/components/training/hub/history-filters';
import type { ClientActivity } from '@/lib/query/types';
import { Button } from '@/components/ui/button';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { LinkButton } from '@/components/ui/link-button';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { InstrumentListChipSkeleton } from '@/components/ui/instruments/instrument-list-chip';
import { useActivities, useRecords } from '@/hooks/use-data';
import { useResetWhenHidden } from '@/hooks/use-reset-when-hidden';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CalendarPlus, FilterX, Link2, MoreHorizontal, X } from 'lucide-react';

const CreateHikeTripDialog = dynamic(
  () =>
    import('@/components/training/trip/create-hike-trip-dialog').then(
      (mod) => mod.CreateHikeTripDialog,
    ),
  { ssr: false },
);

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

  if (!mounted) return null;

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

  // Selection and the create dialog are transient; the filter overlay is not.
  useResetWhenHidden(() => {
    setCreateDialogOpen(false);
    setSelectionMode(false);
    setSelectedIds(new Set());
  });
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
    <div className={cn('space-y-6', selectionMode && SELECTION_BAR_SPACE)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">
          <HistoryFilters counts={counts} filters={filters} onApply={setFilters} />
        </div>
        {selectionMode ? (
          <Button size="sm" type="button" variant="secondary" onClick={exitSelectionMode}>
            <X className="size-3.5" aria-hidden />
            Annuler
          </Button>
        ) : (
          hasLinkableHikes && (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    aria-label="Actions de l'historique"
                    size="icon-sm"
                    type="button"
                    variant="outline"
                  />
                }
              >
                <MoreHorizontal className="size-4" aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuItem className="cursor-pointer gap-2" onClick={toggleSelectionMode}>
                  <Link2 className="size-3.5" aria-hidden />
                  Lier des randonnées
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        )}
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
            <section key={group.key} className="cv-auto">
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

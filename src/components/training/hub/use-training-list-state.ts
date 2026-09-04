'use client';

import { ActivityType } from '@prisma/client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type { ClientActivity } from '@/lib/query/types';
import { useResetWhenHidden } from '@/hooks/use-reset-when-hidden';
import {
  applyTrainingHistoryFilters,
  parseTrainingHistoryFilters,
  serializeTrainingHistoryFilters,
  type TrainingHistoryFilters,
} from '@/lib/training/history-filters';
import { buildActivityRecordLabels } from '@/lib/training/activity-record-labels';
import type { RecordsPayload } from '@/lib/training/records';

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

export function useTrainingListState(
  activities: ClientActivity[],
  records: RecordsPayload | null | undefined,
) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const urlSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const urlFilters = useMemo(
    () => parseTrainingHistoryFilters(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const [optimisticFilters, setOptimisticFilters] = useState<TrainingHistoryFilters | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useResetWhenHidden(() => {
    setCreateDialogOpen(false);
    setSelectionMode(false);
    setSelectedIds(new Set());
  });

  const filters = optimisticFilters ?? urlFilters;

  useEffect(() => {
    setOptimisticFilters(null);
  }, [urlFilters]);

  useEffect(() => {
    return () => {
      if (urlSyncTimerRef.current) {
        clearTimeout(urlSyncTimerRef.current);
      }
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

  const hasLinkableHikes = useMemo(
    () =>
      filtered.some(
        (activity) => activity.type === ActivityType.HIKE && activity.hikeTripId === null,
      ),
    [filtered],
  );

  const selectedIdsArray = useMemo(() => [...selectedIds], [selectedIds]);
  const recordLabelsById = useMemo(() => buildActivityRecordLabels(records), [records]);

  function toggleSelectionMode() {
    setSelectionMode((active) => {
      if (active) {
        setSelectedIds(new Set());
      }
      return !active;
    });
  }

  function toggleActivitySelection(activityId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(activityId)) {
        next.delete(activityId);
      } else {
        next.add(activityId);
      }
      return next;
    });
  }

  function exitSelectionMode() {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setCreateDialogOpen(false);
  }

  function setFilters(nextFilters: TrainingHistoryFilters) {
    setOptimisticFilters(nextFilters);
    if (urlSyncTimerRef.current) {
      clearTimeout(urlSyncTimerRef.current);
    }
    urlSyncTimerRef.current = setTimeout(() => {
      startTransition(() => {
        const query = serializeTrainingHistoryFilters(nextFilters).toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    }, FILTER_URL_DEBOUNCE_MS);
  }

  return {
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
  };
}

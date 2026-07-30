'use client';

import { ActivityType } from '@prisma/client';
import { format, isSameWeek, startOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { ActivityList } from '@/components/training/activity/activity-list';
import { HistoryFilters } from '@/components/training/hub/history-filters';
import type { ClientActivity } from '@/lib/query/types';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { InstrumentListChipSkeleton } from '@/components/ui/instrument-list-chip';
import { useActivities, useRecords } from '@/hooks/use-data';
import {
  applyTrainingHistoryFilters,
  formatTrainingHistoryFilterStatus,
  parseTrainingHistoryFilters,
  serializeTrainingHistoryFilters,
  type TrainingHistoryFilters,
} from '@/lib/training/history-filters';
import { buildActivityRecordLabels } from '@/lib/training/activity-record-labels';

const TYPE_ORDER: ActivityType[] = [
  ActivityType.RUN,
  ActivityType.BIKE,
  ActivityType.SWIM,
  ActivityType.STRENGTH,
  ActivityType.TRIATHLON,
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
  const [filters, setLocalFilters] = useState<TrainingHistoryFilters>(urlFilters);

  // Keep local filters aligned with browser history (back/forward, shared links).
  useEffect(() => {
    setLocalFilters(urlFilters);
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

  const recordLabelsById = useMemo(() => buildActivityRecordLabels(records), [records]);

  function setFilters(nextFilters: TrainingHistoryFilters) {
    setLocalFilters(nextFilters);
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
      <HistoryFilters counts={counts} filters={filters} onApply={setFilters} />
      <p aria-live="polite" className="sr-only" role="status">
        {activities.length === 0
          ? 'Aucune activité enregistrée.'
          : formatTrainingHistoryFilterStatus(filtered.length)}
      </p>
      {weekGroups.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {activities.length === 0
            ? 'Aucune activité enregistrée.'
            : 'Aucune activité ne correspond aux filtres.'}
        </p>
      ) : (
        weekGroups.map((group) => (
          <section key={group.key}>
            <p className="text-label mb-2 px-0.5">{group.label}</p>
            <ActivityList
              activities={group.activities}
              chipListClassName="sm:grid sm:grid-cols-2 sm:gap-2 sm:space-y-0"
              recordLabelsById={recordLabelsById}
              variant="chip"
            />
          </section>
        ))
      )}
    </div>
  );
}

'use client';

import { ActivityType } from '@prisma/client';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { ActivityList } from '@/components/training/activity/activity-list';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useActivities } from '@/hooks/use-data';
import { activityTypeLabels } from '@/lib/format';
import { cn } from '@/lib/utils';

const TYPE_ORDER: ActivityType[] = [
  ActivityType.RUN,
  ActivityType.BIKE,
  ActivityType.SWIM,
  ActivityType.STRENGTH,
  ActivityType.TRIATHLON,
  ActivityType.OTHER,
];

function isActivityType(value: string | null): value is ActivityType {
  return value != null && TYPE_ORDER.includes(value as ActivityType);
}

const ALL_TYPES_VALUE = 'all';

function filterLabel(type: ActivityType | null, counts: Record<ActivityType, number>): string {
  if (type == null) {
    const total = TYPE_ORDER.reduce((sum, t) => sum + counts[t], 0);
    return `Tous (${total})`;
  }
  return `${activityTypeLabels[type]} (${counts[type]})`;
}

function ActivityTypeFilterPills({
  selected,
  counts,
  onSelect,
}: {
  selected: ActivityType | null;
  counts: Record<ActivityType, number>;
  onSelect: (type: ActivityType | null) => void;
}) {
  const total = TYPE_ORDER.reduce((sum, type) => sum + counts[type], 0);

  return (
    <div className="surface-shell flex w-fit flex-wrap gap-1 rounded-full p-1">
      <button
        aria-pressed={selected == null}
        type="button"
        className={cn(
          'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
          selected == null
            ? 'bg-highlight text-highlight-foreground'
            : 'text-muted-foreground hover:text-foreground',
        )}
        onClick={() => onSelect(null)}
      >
        Tous
        <span className="text-muted-foreground ml-1 tabular-nums">({total})</span>
      </button>
      {TYPE_ORDER.map((type) => {
        const count = counts[type];
        if (count === 0) return null;
        const active = selected === type;
        return (
          <button
            key={type}
            aria-pressed={active}
            type="button"
            className={cn(
              'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              active
                ? 'bg-highlight text-highlight-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onSelect(type)}
          >
            {activityTypeLabels[type]}
            <span className="text-muted-foreground ml-1 tabular-nums">({count})</span>
          </button>
        );
      })}
    </div>
  );
}

function ActivityTypeFilterSelect({
  selected,
  counts,
  onSelect,
}: {
  selected: ActivityType | null;
  counts: Record<ActivityType, number>;
  onSelect: (type: ActivityType | null) => void;
}) {
  const value = selected ?? ALL_TYPES_VALUE;

  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (!next || next === ALL_TYPES_VALUE) onSelect(null);
        else if (isActivityType(next)) onSelect(next);
      }}
    >
      <SelectTrigger className="bg-analysis-surface min-h-11 w-full rounded-xl px-3.5 text-sm">
        <SelectValue placeholder="Type d'activité">{filterLabel(selected, counts)}</SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItem value={ALL_TYPES_VALUE}>{filterLabel(null, counts)}</SelectItem>
        {TYPE_ORDER.map((type) => {
          const count = counts[type];
          if (count === 0) return null;
          return (
            <SelectItem key={type} value={type}>
              {filterLabel(type, counts)}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

function ActivityTypeFilter({
  selected,
  counts,
  onSelect,
}: {
  selected: ActivityType | null;
  counts: Record<ActivityType, number>;
  onSelect: (type: ActivityType | null) => void;
}) {
  return (
    <>
      <div className="sm:hidden">
        <ActivityTypeFilterSelect counts={counts} selected={selected} onSelect={onSelect} />
      </div>
      <div className="hidden sm:block">
        <ActivityTypeFilterPills counts={counts} selected={selected} onSelect={onSelect} />
      </div>
    </>
  );
}

export function TrainingListFallback() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-11 w-full rounded-xl sm:h-9 sm:max-w-xl sm:rounded-full" />
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-[68px] w-full" />
      ))}
    </div>
  );
}

export function TrainingList() {
  const { data, isPending } = useActivities();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const rawType = searchParams.get('type');
  const selectedType = isActivityType(rawType) ? rawType : null;

  const activities = data ?? [];

  const counts = useMemo(() => {
    const next = Object.fromEntries(TYPE_ORDER.map((t) => [t, 0])) as Record<ActivityType, number>;
    for (const activity of activities) {
      next[activity.type] += 1;
    }
    return next;
  }, [activities]);

  const filtered = useMemo(
    () => (selectedType == null ? activities : activities.filter((a) => a.type === selectedType)),
    [activities, selectedType],
  );

  function setTypeFilter(type: ActivityType | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (type == null) params.delete('type');
    else params.set('type', type);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  if (isPending) {
    return <TrainingListFallback />;
  }

  return (
    <div className="space-y-4">
      <ActivityTypeFilter counts={counts} selected={selectedType} onSelect={setTypeFilter} />
      <ActivityList
        activities={filtered}
        emptyLabel={selectedType ? 'Aucune activité de ce type.' : undefined}
      />
    </div>
  );
}

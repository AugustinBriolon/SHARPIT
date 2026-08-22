'use client';

import type { ActivityType } from '@prisma/client';
import { activityTypeLabels } from '@/lib/format';
import type { ThreadSportFilter } from '@/hooks/use-training-thread';
import { cn } from '@/lib/utils';

/**
 * Sports present in the window, with what each would leave on screen.
 *
 * Only sports that actually occur are offered: a pill reading "Natation 0" is a
 * control that does nothing, and the count is what makes it worth pressing.
 */
export function ThreadSportFilters({
  counts,
  value,
  onChange,
}: {
  counts: { all: number; byType: Map<ActivityType, number> };
  value: ThreadSportFilter;
  onChange: (next: ThreadSportFilter) => void;
}) {
  const present = [...counts.byType.entries()]
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  if (present.length <= 1) return null;

  const options: { key: ThreadSportFilter; label: string; count: number }[] = [
    { key: 'ALL', label: 'Tout', count: counts.all },
    ...present.map(([type, count]) => ({
      key: type as ThreadSportFilter,
      label: activityTypeLabels[type],
      count,
    })),
  ];

  return (
    <div
      aria-label="Filtrer le fil par sport"
      className="-mx-1 flex scrollbar-none gap-1.5 overflow-x-auto px-1 pb-0.5"
      role="group"
    >
      {options.map((option) => {
        const active = option.key === value;
        return (
          <button
            key={option.key}
            aria-pressed={active}
            type="button"
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs transition-colors',
              'focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden lg:min-h-9',
              active
                ? 'bg-highlight text-highlight-foreground font-medium'
                : 'chip-surface-lg text-muted-foreground hover:text-foreground',
            )}
            onClick={() => onChange(option.key)}
          >
            {option.label}
            <span className="text-data tabular-nums opacity-70">{option.count}</span>
          </button>
        );
      })}
    </div>
  );
}

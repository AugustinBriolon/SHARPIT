import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type InstrumentMetricItem = {
  label: string;
  value: string | null;
};

function desktopCols(count: number): string {
  if (count >= 4) return 'sm:grid-cols-4';
  if (count === 3) return 'sm:grid-cols-3';
  if (count === 1) return 'sm:grid-cols-1';
  return 'sm:grid-cols-2';
}

/**
 * Neutral KPI chip — overflow-visible so large tabular values stay readable
 * instead of truncating inside a tight box. Mobile: snap strip; desktop: grid.
 */
export function InstrumentMetricChip({
  label,
  value,
  loading = false,
  className,
}: {
  label: string;
  value: string | null;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div
      aria-busy={loading || undefined}
      className={cn(
        'chip-surface relative min-w-[9.75rem] overflow-visible rounded-2xl px-3.5 py-3.5 sm:min-w-0 sm:px-4 sm:py-4',
        'shrink-0 snap-start sm:shrink',
        className,
      )}
    >
      <p className="text-label">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-20 rounded-lg" />
      ) : (
        <p
          className={cn(
            'text-data text-foreground mt-1.5 font-semibold tabular-nums',
            // Fluid type: may paint into the gutter; never truncate mid-value.
            'overflow-visible text-[clamp(1.25rem,4.8vw,1.875rem)] leading-[1.05]',
            'whitespace-nowrap',
          )}
        >
          {value ?? '—'}
        </p>
      )}
    </div>
  );
}

export function InstrumentMetricGrid({
  items,
  loading = false,
  className,
}: {
  items: InstrumentMetricItem[];
  loading?: boolean;
  className?: string;
}) {
  if (items.length === 0 && !loading) return null;

  const visible =
    loading && items.length === 0
      ? Array.from({ length: 4 }, (_, i) => ({ label: `metric-${i}`, value: null }))
      : items;

  return (
    <div
      className={cn(
        'flex gap-2.5 overflow-x-auto overflow-y-visible overscroll-x-contain',
        'snap-x snap-mandatory scroll-px-0.5',
        '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        'sm:grid sm:snap-none sm:gap-3 sm:overflow-visible',
        desktopCols(visible.length),
        className,
      )}
    >
      {visible.map((item) => (
        <InstrumentMetricChip
          key={item.label}
          label={loading && items.length === 0 ? '…' : item.label}
          loading={loading}
          value={item.value}
        />
      ))}
    </div>
  );
}

/** Strength / custom grids that already know their children. */
export function InstrumentMetricGridShell({
  count,
  children,
  className,
}: {
  count: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex gap-2.5 overflow-x-auto overflow-y-visible overscroll-x-contain',
        'snap-x snap-mandatory',
        '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        'sm:grid sm:snap-none sm:gap-3 sm:overflow-visible',
        desktopCols(count),
        className,
      )}
    >
      {children}
    </div>
  );
}

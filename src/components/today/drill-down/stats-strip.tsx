import { cn } from '@/lib/utils';
import type { MetricTone } from '@/lib/metric-tone';
import { METRIC_TONE_CLASS } from '@/lib/metric-tone';

export type StatsStripItem = {
  label: string;
  value: string;
  /** Unit suffix rendered after the value (e.g. ms) — keep short. */
  sub?: string;
  tone?: MetricTone;
};

function desktopChipCols(count: number): string {
  if (count >= 4) return 'sm:grid-cols-4';
  if (count === 3) return 'sm:grid-cols-3';
  return 'sm:grid-cols-2';
}

/**
 * Compact instrument chips — no parent panel.
 * Mobile: horizontal snap scroll (native-app rhythm).
 * Desktop: even grid row.
 */
export function DrillDownStatsStrip({ items }: { items: StatsStripItem[] }) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Signaux de la dimension"
      className={cn(
        'flex gap-2 overflow-x-auto overscroll-x-contain',
        'snap-x snap-mandatory scroll-px-0.5',
        '[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden',
        'sm:grid sm:snap-none sm:overflow-visible',
        desktopChipCols(items.length),
      )}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            'border-analysis-border/80 bg-background/50',
            'inline-flex shrink-0 items-center gap-1.5',
            'snap-start rounded-xl border px-3 py-2.5',
            'min-w-[7.5rem] sm:min-w-0 sm:rounded-lg sm:px-2.5 sm:py-1.5',
          )}
        >
          <span className="text-label shrink-0">{item.label}</span>
          <span
            className={cn(
              'text-data min-w-0 truncate text-sm tabular-nums',
              item.tone ? METRIC_TONE_CLASS[item.tone] : 'text-foreground',
            )}
          >
            {item.value}
            {item.sub ? (
              <span className="text-muted-foreground ml-1 font-normal">{item.sub}</span>
            ) : null}
          </span>
        </div>
      ))}
    </nav>
  );
}

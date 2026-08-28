'use client';

import { cn } from '@/lib/utils';
import {
  defaultFormat,
  MarkerScale,
  type MarkerRange,
} from '@/components/today/drill-down/marker-band';
import { deriveMarkerCardState } from '@/components/today/drill-down/marker-band-helpers';

export function MarkerCardValue({
  value,
  unit,
  concerning,
  format,
}: {
  value: number | null;
  unit: string;
  concerning: boolean;
  format: (value: number) => string;
}) {
  return (
    <span className="mt-1 flex items-baseline gap-1">
      <span
        className={cn(
          'text-data text-2xl font-semibold tabular-nums',
          concerning ? 'text-signal-caution' : 'text-primary',
        )}
      >
        {value !== null ? format(value) : '—'}
      </span>
      <span className="text-muted-foreground text-xs">{unit}</span>
    </span>
  );
}

export function MarkerCard({
  label,
  value,
  unit,
  lowerIsBetter = false,
  range = null,
  format = defaultFormat,
  onOpen,
}: {
  label: string;
  value: number | null;
  unit: string;
  lowerIsBetter?: boolean;
  range?: MarkerRange | null;
  format?: (value: number) => string;
  onOpen: () => void;
}) {
  const { concerning, positionLabel } = deriveMarkerCardState({ value, range, lowerIsBetter });

  return (
    <button
      type="button"
      className={cn(
        'border-analysis-border/60 bg-background/40 rounded-analysis w-full border p-3 text-left',
        'hover:border-analysis-border focus-visible:outline-ring transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2',
      )}
      onClick={onOpen}
    >
      <span className="text-muted-foreground block truncate text-sm">{label}</span>
      <MarkerCardValue concerning={concerning} format={format} unit={unit} value={value} />
      {range && value !== null ? (
        <MarkerScale className="mt-2" concerning={concerning} range={range} value={value} />
      ) : null}
      <span
        className={cn(
          'mt-1.5 block text-xs first-letter:uppercase',
          concerning ? 'text-signal-caution' : 'text-muted-foreground',
        )}
      >
        {positionLabel}
      </span>
    </button>
  );
}

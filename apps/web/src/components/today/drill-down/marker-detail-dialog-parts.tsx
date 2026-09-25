'use client';

import { cn } from '@/lib/utils';
import {
  BAND_START_PCT,
  BAND_WIDTH_PCT,
  MarkerScale,
  type MarkerRange,
} from '@/components/today/drill-down/marker-band';

export function MarkerDetailValueRow({
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
    <div className="flex items-baseline gap-2">
      <span
        className={cn(
          'text-data text-3xl font-semibold tabular-nums',
          concerning ? 'text-signal-caution' : 'text-primary',
        )}
      >
        {value !== null ? format(value) : '—'}
      </span>
      <span className="text-muted-foreground text-sm">{unit}</span>
    </div>
  );
}

export function MarkerDetailRangeLabels({
  range,
  format,
}: {
  range: MarkerRange;
  format: (value: number) => string;
}) {
  return (
    <div className="text-muted-foreground relative mt-1.5 h-4 text-xs">
      <span
        className="text-data absolute -translate-x-1/2 tabular-nums"
        style={{ left: `${BAND_START_PCT}%` }}
      >
        {format(range.low)}
      </span>
      <span
        className="absolute -translate-x-1/2"
        style={{ left: `${BAND_START_PCT + BAND_WIDTH_PCT / 2}%` }}
      >
        {range.kind === 'baseline' ? 'ta norme' : 'plage 14 j'}
      </span>
      <span
        className="text-data absolute -translate-x-1/2 tabular-nums"
        style={{ left: `${BAND_START_PCT + BAND_WIDTH_PCT}%` }}
      >
        {format(range.high)}
      </span>
    </div>
  );
}

export function MarkerDetailRangeBlock({
  range,
  value,
  concerning,
  format,
}: {
  range: MarkerRange;
  value: number;
  concerning: boolean;
  format: (value: number) => string;
}) {
  return (
    <div>
      <MarkerScale concerning={concerning} range={range} value={value} />
      <MarkerDetailRangeLabels format={format} range={range} />
    </div>
  );
}

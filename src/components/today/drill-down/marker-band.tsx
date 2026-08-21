'use client';

import { Sparkline } from '@/components/today/dashboard/sparkline';
import { cn } from '@/lib/utils';

/**
 * One physiological marker, read at a glance.
 *
 * A bare number forces the athlete to recall his own normal and subtract in his
 * head. Here the value sits on the range it belongs to, so "below my baseline"
 * is seen rather than computed — the way a lab instrument reports a reading
 * against its reference interval.
 *
 * `kind` keeps the two references honest: a computed physiological baseline and
 * the span merely observed over a fortnight do not mean the same thing, and one
 * must not borrow the authority of the other.
 */
export type MarkerRange = {
  low: number;
  high: number;
  kind: 'baseline' | 'observed';
};

export type MarkerBandProps = {
  label: string;
  value: number | null;
  unit: string;
  /** Change against the trailing week, already signed. */
  delta?: number | null;
  /** Lower is better for this marker — a rise reads as a warning, not a win. */
  lowerIsBetter?: boolean;
  range?: MarkerRange | null;
  series?: (number | null)[];
};

/**
 * The band occupies the middle of the track, not all of it. The margins are where
 * out-of-range values live: pinned to the band's edge, a low reading looks like a
 * value sitting exactly on the boundary — which is the opposite of what it means.
 */
const BAND_START_PCT = 24;
const BAND_WIDTH_PCT = 52;
const MARKER_MIN_PCT = 4;
const MARKER_MAX_PCT = 96;

function markerPositionPct(value: number, range: MarkerRange): number {
  const span = range.high - range.low;
  if (span <= 0) return 50;
  const ratio = (value - range.low) / span;
  const raw = BAND_START_PCT + ratio * BAND_WIDTH_PCT;
  return Math.min(MARKER_MAX_PCT, Math.max(MARKER_MIN_PCT, raw));
}

export function MarkerBand({
  label,
  value,
  unit,
  delta = null,
  lowerIsBetter = false,
  range = null,
  series,
}: MarkerBandProps) {
  const outside = value != null && range != null && (value < range.low || value > range.high);

  return (
    <div className="space-y-1.5 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-label text-muted-foreground min-w-0 truncate">{label}</span>

        <span className="flex shrink-0 items-baseline gap-2">
          {series && series.length > 1 ? (
            <span className="text-muted-foreground/40 inline-block w-14 self-center">
              <Sparkline h={14} stroke="currentColor" values={series} />
            </span>
          ) : null}
          <span
            className={cn(
              'text-data text-sm tabular-nums',
              outside ? 'text-signal-caution' : 'text-foreground',
            )}
          >
            {value != null ? value : '—'}
            <span className="text-muted-foreground ml-1 text-xs font-normal">{unit}</span>
          </span>
          <span className="text-data text-muted-foreground w-12 text-right text-xs tabular-nums">
            {delta != null && delta !== 0
              ? `${delta > 0 ? '+' : '−'}${Math.abs(Math.round(delta))}`
              : ''}
          </span>
        </span>
      </div>

      {range && value != null ? (
        <div className="relative h-4">
          {/* The reference interval, drawn once so every marker reads the same way. */}
          <div
            className="bg-muted-foreground/15 absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
            style={{ left: `${BAND_START_PCT}%`, width: `${BAND_WIDTH_PCT}%` }}
          />
          <div
            style={{ left: `${markerPositionPct(value, range)}%` }}
            className={cn(
              'absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full',
              outside ? 'bg-signal-caution' : 'bg-foreground',
            )}
            aria-hidden
          />
          <span
            className="text-muted-foreground/60 absolute top-full -translate-x-1/2 text-[10px]"
            style={{ left: `${BAND_START_PCT}%` }}
          >
            {range.low}
          </span>
          <span
            className="text-muted-foreground/60 absolute top-full -translate-x-1/2 text-[10px]"
            style={{ left: `${BAND_START_PCT + BAND_WIDTH_PCT}%` }}
          >
            {range.high}
          </span>
          <span className="text-muted-foreground/50 absolute top-full left-1/2 -translate-x-1/2 text-[10px]">
            {range.kind === 'baseline' ? 'ta norme' : '14 j'}
          </span>
        </div>
      ) : null}

      <span className="sr-only">
        {value != null && range
          ? `${label} ${value} ${unit}, ${outside ? 'hors' : 'dans'} ${
              range.kind === 'baseline' ? 'la norme' : 'la plage des 14 jours'
            } ${range.low} à ${range.high}${lowerIsBetter ? ', plus bas est mieux' : ''}`
          : `${label} indisponible`}
      </span>
    </div>
  );
}

'use client';

import { Sparkline } from '@/components/today/dashboard/sparkline';
import { cn } from '@/lib/utils';

/**
 * One physiological marker, read in a single sweep.
 *
 * A bare number makes the athlete recall his own normal and subtract in his head.
 * Here the value sits next to the range it belongs to — literally next to it: an
 * earlier version put the track at one end of the row and the number at the
 * other, which restored the very lookup the band was meant to remove.
 *
 * Position is never carried by colour alone. The word says it, the colour only
 * reinforces (WCAG 1.4.1), and the track is fixed-width so a wide screen spreads
 * the row instead of stretching the scale into meaninglessness.
 */
export type MarkerRange = {
  low: number;
  high: number;
  /** `observed` is a fortnight seen, not a computed norm — never label it as one. */
  kind: 'baseline' | 'observed';
};

export type MarkerBandProps = {
  label: string;
  value: number | null;
  unit: string;
  delta?: number | null;
  /** A rise reads as a warning for this marker, not a win. */
  lowerIsBetter?: boolean;
  range?: MarkerRange | null;
  series?: (number | null)[];
};

const BAND_START_PCT = 24;
const BAND_WIDTH_PCT = 52;
const MARKER_MIN_PCT = 4;
const MARKER_MAX_PCT = 96;

function markerPositionPct(value: number, range: MarkerRange): number {
  const span = range.high - range.low;
  if (span <= 0) return 50;
  const ratio = (value - range.low) / span;
  return Math.min(
    MARKER_MAX_PCT,
    Math.max(MARKER_MIN_PCT, BAND_START_PCT + ratio * BAND_WIDTH_PCT),
  );
}

type Position = 'below' | 'inside' | 'above';

function positionOf(value: number, range: MarkerRange): Position {
  if (value < range.low) return 'below';
  if (value > range.high) return 'above';
  return 'inside';
}

const POSITION_WORD: Record<Position, string> = {
  below: 'sous',
  inside: 'dans',
  above: 'au-dessus',
};

function isConcerning(position: Position, lowerIsBetter: boolean): boolean {
  if (position === 'inside') return false;
  return lowerIsBetter ? position === 'above' : position === 'below';
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
  const position = value != null && range != null ? positionOf(value, range) : null;
  const concerning = position != null && isConcerning(position, lowerIsBetter);
  const rangeWord = range?.kind === 'baseline' ? 'norme' : '14 j';

  return (
    <div className="py-3">
      {/* Columns stay grouped instead of spanning the viewport: a wide screen must
          not push a label six hundred pixels from the value it names. */}
      <div className="flex items-center gap-3">
        <span className="text-foreground w-24 shrink-0 truncate text-sm font-medium sm:w-32">
          {label}
        </span>

        {/* Fixed width: the scale must not stretch with the viewport, and the value
            has to stay within a glance of its own position. */}
        {range && value != null ? (
          <div className="relative h-3 w-24 shrink-0 sm:w-32">
            <div
              className="bg-muted-foreground/25 absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
              style={{ left: `${BAND_START_PCT}%`, width: `${BAND_WIDTH_PCT}%` }}
            />
            <div
              style={{ left: `${markerPositionPct(value, range)}%` }}
              className={cn(
                'absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full',
                concerning ? 'bg-signal-caution' : 'bg-foreground',
              )}
              aria-hidden
            />
          </div>
        ) : null}

        <span
          className={cn(
            'text-data w-24 shrink-0 text-sm tabular-nums',
            concerning ? 'text-signal-caution' : 'text-foreground',
          )}
        >
          {value != null ? value : '—'}
          <span className="text-muted-foreground ml-1 text-xs font-normal">{unit}</span>
        </span>
      </div>

      <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        {position ? (
          <span className={cn(concerning && 'text-signal-caution font-medium')}>
            {POSITION_WORD[position]} {rangeWord}
            <span className="text-data ml-1.5 tabular-nums">
              {range?.low}–{range?.high}
            </span>
          </span>
        ) : (
          <span>Pas de référence</span>
        )}

        {delta != null && delta !== 0 ? (
          <span className="text-data tabular-nums">
            {delta > 0 ? '+' : '−'}
            {Math.abs(Math.round(delta))} / 7 j
          </span>
        ) : null}

        {series && series.length > 1 ? (
          <span className="text-muted-foreground inline-block w-16">
            <Sparkline h={14} stroke="currentColor" values={series} />
          </span>
        ) : null}
      </div>

      <span className="sr-only">
        {value == null
          ? `${label} indisponible`
          : `${label} ${value} ${unit}${
              position && range
                ? `, ${POSITION_WORD[position]} ${
                    range.kind === 'baseline' ? 'la norme' : 'la plage des 14 jours'
                  } ${range.low} à ${range.high}`
                : ''
            }${delta != null && delta !== 0 ? `, ${delta > 0 ? 'en hausse' : 'en baisse'} de ${Math.abs(Math.round(delta))} sur 7 jours` : ''}`}
      </span>
    </div>
  );
}

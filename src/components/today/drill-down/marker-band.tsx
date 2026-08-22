'use client';

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
export function defaultFormat(value: number): string {
  return String(value);
}

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

/**
 * The card states the reading; the working lives behind it.
 *
 * Label, value, and where that value sits — nothing else. The scale, the trend
 * and the sentence explaining what the marker measures open on demand, so a
 * screen read every morning is not carrying an explanation nobody rereads.
 */

/**
 * Where the value sits, drawn on a full rail with the reference interval marked.
 *
 * Shared by the card and the module: the athlete reads the same picture in both,
 * so opening the detail confirms what the card said instead of restating it in
 * another form.
 */
export function MarkerScale({
  value,
  range,
  concerning,
  className,
}: {
  value: number;
  range: MarkerRange;
  concerning: boolean;
  className?: string;
}) {
  return (
    <div className={cn('relative h-3 w-full', className)}>
      {/* Full rail first: a value outside its interval must sit on something, or it
          reads as detached rather than as low. */}
      <div className="bg-muted-foreground/20 absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full" />
      <div
        className="bg-muted-foreground/60 absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
        style={{ left: `${BAND_START_PCT}%`, width: `${BAND_WIDTH_PCT}%` }}
      />
      <div
        style={{ left: `${markerPositionPct(value, range)}%` }}
        className={cn(
          'absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full',
          concerning ? 'bg-signal-caution' : 'bg-primary',
        )}
        aria-hidden
      />
    </div>
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
  /** Ratios and signed balances need their own rendering; counts do not. */
  format?: (value: number) => string;
  onOpen: () => void;
}) {
  const position = value != null && range != null ? positionOf(value, range) : null;
  const concerning = position != null && isConcerning(position, lowerIsBetter);
  const rangeWord = range?.kind === 'baseline' ? 'norme' : '14 j';

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

      <span className="mt-1 flex items-baseline gap-1">
        <span
          className={cn(
            'text-data text-2xl font-semibold tabular-nums',
            concerning ? 'text-signal-caution' : 'text-primary',
          )}
        >
          {value != null ? format(value) : '—'}
        </span>
        <span className="text-muted-foreground text-xs">{unit}</span>
      </span>

      {range && value != null ? (
        <MarkerScale className="mt-2" concerning={concerning} range={range} value={value} />
      ) : null}

      <span
        className={cn(
          'mt-1.5 block text-xs first-letter:uppercase',
          concerning ? 'text-signal-caution' : 'text-muted-foreground',
        )}
      >
        {position ? `${POSITION_WORD[position]} ${rangeWord}` : 'Pas de référence'}
      </span>
    </button>
  );
}

export {
  positionOf,
  isConcerning,
  POSITION_WORD,
  markerPositionPct,
  BAND_START_PCT,
  BAND_WIDTH_PCT,
};

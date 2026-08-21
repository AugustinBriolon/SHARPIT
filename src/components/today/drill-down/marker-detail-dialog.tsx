'use client';

import { Sparkline } from '@/components/today/dashboard/sparkline';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  BAND_START_PCT,
  BAND_WIDTH_PCT,
  MarkerScale,
  type MarkerRange,
} from '@/components/today/drill-down/marker-band';

/**
 * The full reading of one marker, opened on demand.
 *
 * The card carries the answer; this carries the working. Explanations that stand
 * permanently on screen stop informing after the second visit, so the sentence
 * saying what a marker actually measures lives here — read once, then skipped by
 * anyone who already knows.
 */
export type MarkerDetail = {
  label: string;
  value: number | null;
  unit: string;
  delta: number | null;
  range: MarkerRange | null;
  series: (number | null)[];
  /** What this marker measures, in plain words. */
  explanation: string;
  /** Why it matters for a decision today. */
  reading?: string | null;
  concerning: boolean;
  positionWord: string | null;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-analysis-border/40 flex items-baseline justify-between gap-4 border-b py-2.5 last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-data text-foreground text-sm tabular-nums">{value}</span>
    </div>
  );
}

export function MarkerDetailDialog({
  detail,
  onClose,
}: {
  detail: MarkerDetail | null;
  onClose: () => void;
}) {
  if (!detail) return null;

  const { range, value, delta, series } = detail;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{detail.label}</DialogTitle>
        </DialogHeader>

        {/* Today first: the same picture the card showed, larger. Understanding where
            you stand comes before comparing it with a fortnight of history. */}
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'text-data text-3xl font-semibold tabular-nums',
              detail.concerning ? 'text-signal-caution' : 'text-primary',
            )}
          >
            {value != null ? value : '—'}
          </span>
          <span className="text-muted-foreground text-sm">{detail.unit}</span>
        </div>

        {range && value != null ? (
          <div>
            <MarkerScale concerning={detail.concerning} range={range} value={value} />
            {/* Pinned to the band edges, not the rail edges: printed at the extremes
                these two numbers label the wrong points and misplace the whole scale. */}
            <div className="text-muted-foreground relative mt-1.5 h-4 text-xs">
              <span
                className="text-data absolute -translate-x-1/2 tabular-nums"
                style={{ left: `${BAND_START_PCT}%` }}
              >
                {range.low}
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
                {range.high}
              </span>
            </div>
          </div>
        ) : null}

        {detail.positionWord ? (
          <p
            className={cn(
              'text-sm font-medium',
              detail.concerning ? 'text-signal-caution' : 'text-foreground',
            )}
          >
            {detail.positionWord}
          </p>
        ) : null}

        <DialogDescription>{detail.explanation}</DialogDescription>

        {/* History second, and only then. */}
        {series.length > 1 ? (
          <div className="border-analysis-border/40 border-t pt-3">
            <p className="text-label text-muted-foreground">Évolution</p>
            <div className="text-muted-foreground mt-2">
              <Sparkline h={44} stroke="currentColor" values={series} />
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-muted-foreground text-xs">14 derniers jours</span>
              {delta != null ? (
                <span className="text-data text-foreground text-xs tabular-nums">
                  {delta > 0 ? '+' : '−'}
                  {Math.abs(Math.round(delta))} {detail.unit} / 7 j
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {detail.reading ? (
          <p className="text-foreground text-sm leading-relaxed">{detail.reading}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

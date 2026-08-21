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
import type { MarkerRange } from '@/components/today/drill-down/marker-band';

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
          <DialogDescription>{detail.explanation}</DialogDescription>
        </DialogHeader>

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

        {series.length > 1 ? (
          <div className="text-muted-foreground">
            <Sparkline h={44} stroke="currentColor" values={series} />
            <p className="text-muted-foreground mt-1 text-xs">14 derniers jours</p>
          </div>
        ) : null}

        <div>
          {range ? (
            <Row
              label={range.kind === 'baseline' ? 'Ta norme' : 'Plage des 14 jours'}
              value={`${range.low} – ${range.high} ${detail.unit}`}
            />
          ) : null}
          {detail.positionWord ? <Row label="Position" value={detail.positionWord} /> : null}
          {delta != null ? (
            <Row
              label="Écart sur 7 jours"
              value={`${delta > 0 ? '+' : '−'}${Math.abs(Math.round(delta))} ${detail.unit}`}
            />
          ) : null}
        </div>

        {detail.reading ? (
          <p className="text-foreground text-sm leading-relaxed">{detail.reading}</p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

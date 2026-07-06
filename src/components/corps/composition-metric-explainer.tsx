'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { CorpsTone } from '@/components/corps/corps-ui';
import {
  getGuide,
  metricScalePosition,
  type CompositionContext,
  type CompositionMetricId,
  type MetricGuide,
} from '@/lib/composition-metric-guides';

const TONE_BG: Record<CorpsTone, string> = {
  good: 'bg-emerald-500/80',
  moderate: 'bg-amber-500/80',
  low: 'bg-red-500/80',
  neutral: 'bg-muted-foreground/30',
};

const TONE_BADGE: Record<CorpsTone, string> = {
  good: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  moderate: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  low: 'bg-red-500/10 text-red-700 dark:text-red-400',
  neutral: 'bg-muted text-muted-foreground',
};

function MetricScale({ guide, value }: { guide: MetricGuide; value: number }) {
  const scaleInput = guide.scaleValue ? guide.scaleValue(value) : value;
  const marker = metricScalePosition(scaleInput, guide.zones);
  return (
    <div className="space-y-3">
      <div className="relative h-2.5 overflow-hidden rounded-full">
        <div className="flex h-full w-full">
          {guide.zones.map((zone) => (
            <div
              key={zone.label}
              className={cn(
                'h-full flex-1 first:rounded-l-full last:rounded-r-full',
                TONE_BG[zone.tone],
              )}
              style={{
                flex: zone.max - zone.min,
              }}
            />
          ))}
        </div>
        <div
          className="border-background bg-foreground absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm"
          style={{ left: `${marker}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {guide.zones.map((zone) => (
          <span key={zone.label} className="text-muted-foreground text-[10px]">
            <span className={cn('mr-1 inline-block size-1.5 rounded-full', TONE_BG[zone.tone])} />
            {zone.label}
            {zone.max < 999 && guide.unit ? ` (< ${zone.max} ${guide.unit})` : null}
          </span>
        ))}
      </div>
    </div>
  );
}

const AGE_COMPARED_METRICS: CompositionMetricId[] = ['vascularAgeYears', 'metabolicAge', 'bmi'];

export function CompositionMetricExplainer({
  open,
  onOpenChange,
  metricId,
  value,
  displayValue,
  context,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricId: CompositionMetricId;
  value: number;
  displayValue: string;
  context: CompositionContext;
}) {
  const guide = getGuide(metricId);

  const interpretation = useMemo(() => guide.interpret(value, context), [guide, value, context]);

  const needsProfileAge =
    AGE_COMPARED_METRICS.includes(metricId) && context.chronologicalAgeYears == null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{guide.title}</DialogTitle>
          <DialogDescription>{guide.summary}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.15em] uppercase">
                Ta mesure
              </p>
              <p className="font-heading mt-1 text-3xl font-semibold tabular-nums">
                {displayValue}
              </p>
            </div>
            <span
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium',
                TONE_BADGE[interpretation.tone],
              )}
            >
              {interpretation.zoneLabel}
            </span>
          </div>

          {!guide.hideScale && guide.zones.length > 0 && (
            <MetricScale guide={guide} value={value} />
          )}

          <p className="text-muted-foreground text-sm leading-relaxed">{guide.explanation}</p>

          {interpretation.personalizedNote && (
            <p className="bg-primary/5 text-foreground rounded-xl border px-3 py-2.5 text-sm leading-relaxed">
              {interpretation.personalizedNote}
            </p>
          )}

          {needsProfileAge && (
            <p className="text-muted-foreground rounded-xl border border-dashed px-3 py-2.5 text-xs leading-relaxed">
              Renseigne ta date de naissance dans{' '}
              <Link className="text-foreground font-medium hover:underline" href="/profil">
                Profil
              </Link>{' '}
              pour personnaliser la comparaison avec ton âge réel.
            </p>
          )}

          {context.chronologicalAgeYears != null && AGE_COMPARED_METRICS.includes(metricId) && (
            <p className="text-muted-foreground text-[11px]">
              Comparaison basée sur ton profil athlète ({context.chronologicalAgeYears} ans).
            </p>
          )}

          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Indication sportive et éducative — ne remplace pas un avis médical. Les seuils sont des
            repères populationnels ; ton contexte d’entraînement peut les modifier.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

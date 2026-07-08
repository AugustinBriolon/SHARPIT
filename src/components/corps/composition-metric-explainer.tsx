'use client';

import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { BodyMetricExplainerVm } from '@/core/presentation/body-view-model';
import type { CorpsTone } from '@/lib/metric-tone';

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

function MetricScale({
  zones,
  markerPct,
  unit,
}: {
  zones: BodyMetricExplainerVm['zones'];
  markerPct: number | null;
  unit: string;
}) {
  return (
    <div className="space-y-3">
      <div className="relative h-2.5 overflow-hidden rounded-full">
        <div className="flex h-full w-full">
          {zones.map((zone) => (
            <div
              key={zone.label}
              style={{ flex: zone.max - zone.min }}
              className={cn(
                'h-full flex-1 first:rounded-l-full last:rounded-r-full',
                TONE_BG[zone.tone],
              )}
            />
          ))}
        </div>
        {markerPct != null ? (
          <div
            className="border-background bg-foreground absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm"
            style={{ left: `${markerPct}%` }}
          />
        ) : null}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {zones.map((zone) => (
          <span key={zone.label} className="text-muted-foreground text-[10px]">
            <span className={cn('mr-1 inline-block size-1.5 rounded-full', TONE_BG[zone.tone])} />
            {zone.label}
            {zone.max < 999 && unit ? ` (< ${zone.max} ${unit})` : null}
          </span>
        ))}
      </div>
    </div>
  );
}

export function CompositionMetricExplainer({
  open,
  onOpenChange,
  explainer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  explainer: BodyMetricExplainerVm;
}) {
  const {
    interpretation,
    guideTitle,
    guideSummary,
    displayValue,
    hideScale,
    zones,
    scaleMarkerPct,
    guideUnit,
    guideExplanation,
    showProfileAgeHint,
    chronologicalAgeYears,
    showAgeComparisonNote,
  } = explainer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{guideTitle}</DialogTitle>
          <DialogDescription>{guideSummary}</DialogDescription>
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

          {!hideScale && zones.length > 0 ? (
            <MetricScale markerPct={scaleMarkerPct} unit={guideUnit} zones={zones} />
          ) : null}

          <p className="text-muted-foreground text-sm leading-relaxed">{guideExplanation}</p>

          {interpretation.personalizedNote ? (
            <p className="bg-primary/5 text-foreground rounded-xl border px-3 py-2.5 text-sm leading-relaxed">
              {interpretation.personalizedNote}
            </p>
          ) : null}

          {showProfileAgeHint ? (
            <p className="text-muted-foreground rounded-xl border border-dashed px-3 py-2.5 text-xs leading-relaxed">
              Renseigne ta date de naissance dans{' '}
              <Link className="text-foreground font-medium hover:underline" href="/profil">
                Profil
              </Link>{' '}
              pour personnaliser la comparaison avec ton âge réel.
            </p>
          ) : null}

          {showAgeComparisonNote && chronologicalAgeYears != null ? (
            <p className="text-muted-foreground text-[11px]">
              Comparaison basée sur ton profil athlète ({chronologicalAgeYears} ans).
            </p>
          ) : null}

          <p className="text-muted-foreground text-[11px] leading-relaxed">
            Indication sportive et éducative — ne remplace pas un avis médical. Les seuils sont des
            repères populationnels ; ton contexte d’entraînement peut les modifier.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

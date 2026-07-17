'use client';

import type { ReactNode } from 'react';
import { TodayMetricsRow } from '@/components/today/dashboard/today-metrics-row';

import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { cn } from '@/lib/utils';
import { TwinTrustStrip } from '../dashboard/twin-trust-strip';
import { Badge } from '@/components/ui/badge';
import { PhysioRail } from '@/components/ui/physio-rail';

/** Labels temporels courts — peuvent précéder l'action sur une même ligne. */
const TEMPORAL_CONTEXT_LABELS = new Set(['Ce soir', 'Après la séance', 'Jour de repos']);

function canMergeContextWithAction(eyebrow: string, action: string | null): action is string {
  if (!action) return false;
  if (eyebrow.includes('?')) return false;
  return TEMPORAL_CONTEXT_LABELS.has(eyebrow);
}

export function TodayVerdictHero({ vm }: { vm: TodayViewModel }) {
  const { hero } = vm;
  const priority = hero.focusPriority ?? hero.actionLine;
  const useVerdictAccent = hero.verdictStyle.showVerdictColors;
  const heroSignal =
    hero.metricsRow.recoveryScore ?? hero.metricsRow.sleepScore ?? hero.metricsRow.adaptationScore;

  const contextLabel = [hero.postureLabel, hero.eyebrow].filter(Boolean).join(' · ');
  const secondaryLine = priority ?? hero.subline ?? null;
  const secondaryMuted = !priority && Boolean(hero.subline);
  const mergeContextWithAction = canMergeContextWithAction(hero.eyebrow, secondaryLine);
  let secondaryContent: ReactNode = null;
  if (mergeContextWithAction) {
    secondaryContent = (
      <p className="text-sm leading-relaxed">
        <span className="text-muted-foreground">{contextLabel || hero.eyebrow}</span>
        <span className="text-muted-foreground"> — </span>
        <span className={cn('text-foreground', !secondaryMuted && 'font-medium')}>
          {secondaryLine}
        </span>
      </p>
    );
  } else if (secondaryLine) {
    secondaryContent = (
      <p
        className={cn(
          'max-w-2xl text-sm leading-relaxed',
          secondaryMuted ? 'text-muted-foreground' : 'text-foreground font-medium',
        )}
      >
        {secondaryLine}
      </p>
    );
  }

  return (
    <section
      className={cn(
        'analysis-panel-alt rounded-analysis-lg px-5 py-5 sm:px-6 sm:py-6',
        useVerdictAccent && hero.verdictStyle.bgClass,
      )}
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_18rem] xl:items-start">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              {contextLabel ? <p className="text-label">{contextLabel}</p> : null}
              <h1
                className={cn(
                  'font-heading text-xl leading-snug font-semibold tracking-tight sm:text-[1.55rem]',
                  useVerdictAccent ? hero.verdictStyle.colorClass : 'text-foreground',
                )}
              >
                {hero.headline}
              </h1>
            </div>

            {hero.goalLine ? (
              <Badge
                className="border-analysis-border bg-background/70 rounded-full text-xs font-normal"
                variant="outline"
              >
                {hero.goalLine}
              </Badge>
            ) : null}
          </div>

          {secondaryContent}

          <div className="max-w-xl space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-label">position du jour</p>
              <p className="text-muted-foreground text-[10px]">récupération vers intensité haute</p>
            </div>
            <PhysioRail max={100} value={heroSignal} />
          </div>
        </div>

        <div className="analysis-panel rounded-analysis px-4 py-4">
          <p className="text-label">lecture rapide</p>
          <p className="text-data text-foreground mt-2 text-3xl font-semibold">
            {hero.metricsRow.recoveryScore != null
              ? Math.round(hero.metricsRow.recoveryScore)
              : '—'}
            <span className="text-muted-foreground ml-1 text-sm">%</span>
          </p>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Signal de récupération utilisé comme repère central pour lire la disponibilité du jour.
          </p>
        </div>
      </div>

      <div className="pt-4">
        <TodayMetricsRow metricsRow={hero.metricsRow} />
        <TwinTrustStrip
          className="mt-3"
          confidenceHref={hero.twinTrustStrip.confidenceHref}
          confidenceLabel={hero.twinTrustStrip.confidenceLabel}
          confidencePctRounded={hero.twinTrustStrip.confidencePctRounded}
          limitingFactorText={hero.twinTrustStrip.limitingFactorText}
          variant="subtle"
        />
      </div>
    </section>
  );
}

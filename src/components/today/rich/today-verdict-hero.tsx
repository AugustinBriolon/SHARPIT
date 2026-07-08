'use client';

import { TodayMetricsRow } from '@/components/today/dashboard/today-metrics-row';

import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { cn } from '@/lib/utils';
import { TwinTrustStrip } from '../dashboard/twin-trust-strip';
import { Badge } from '@/components/ui/badge';

/** Labels temporels courts — peuvent précéder l'action sur une même ligne. */
const TEMPORAL_CONTEXT_LABELS = new Set(['Ce soir', 'Après la séance']);

function canMergeContextWithAction(eyebrow: string, action: string | null): action is string {
  if (!action) return false;
  if (eyebrow.includes('?')) return false;
  return TEMPORAL_CONTEXT_LABELS.has(eyebrow);
}

export function TodayVerdictHero({ vm }: { vm: TodayViewModel }) {
  const { hero } = vm;
  const priority = hero.focusPriority ?? hero.actionLine;
  const useVerdictAccent = hero.verdictStyle.showVerdictColors;

  const contextLabel = [hero.postureLabel, hero.eyebrow].filter(Boolean).join(' · ');
  const secondaryLine = priority ?? hero.subline ?? null;
  const secondaryMuted = !priority && Boolean(hero.subline);
  const mergeContextWithAction = canMergeContextWithAction(hero.eyebrow, secondaryLine);

  return (
    <section
      className={cn(
        'rounded-2xl border px-5 py-5 sm:px-6 sm:py-6',
        useVerdictAccent ? hero.verdictStyle.bgClass : 'border-border/60 bg-card',
      )}
    >
      <div className="space-y-2">
        <h1
          className={cn(
            'font-heading text-xl leading-snug font-semibold tracking-tight sm:text-[1.375rem]',
            useVerdictAccent ? hero.verdictStyle.colorClass : 'text-foreground',
          )}
        >
          {hero.headline}
        </h1>

        {hero.goalLine ? (
          <Badge className="text-xs font-normal" variant="outline">
            {hero.goalLine}
          </Badge>
        ) : null}

        {mergeContextWithAction ? (
          <p className="text-sm leading-relaxed">
            <span className="text-muted-foreground">{contextLabel || hero.eyebrow}</span>
            <span className="text-muted-foreground"> — </span>
            <span className={cn('text-foreground', !secondaryMuted && 'font-medium')}>
              {secondaryLine}
            </span>
          </p>
        ) : (
          <>
            {contextLabel ? (
              <p className="text-muted-foreground text-xs leading-snug">{contextLabel}</p>
            ) : null}

            {secondaryLine ? (
              <p
                className={cn(
                  'text-sm leading-relaxed',
                  secondaryMuted ? 'text-muted-foreground' : 'text-foreground font-medium',
                )}
              >
                {secondaryLine}
              </p>
            ) : null}
          </>
        )}
      </div>

      <div className="border-border/50 mt-5 border-t pt-4">
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

'use client';

import { TodayMetricsRow } from '@/components/today/dashboard/today-metrics-row';

import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { cn } from '@/lib/utils';
import { TwinTrustStrip } from '../dashboard/twin-trust-strip';

export function TodayVerdictHero({ vm }: { vm: TodayViewModel }) {
  const { hero } = vm;
  const { showVerdictColors } = hero.verdictStyle;

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border bg-linear-to-br to-transparent px-5 py-6 sm:px-7 sm:py-7',
        showVerdictColors
          ? hero.verdictStyle.bgClass
          : 'border-slate-200/80 bg-slate-50/40 dark:border-slate-700/60',
      )}
    >
      <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-[0.14em] uppercase">
        {hero.eyebrow}
      </p>
      <h1
        className={cn(
          'font-heading text-2xl leading-tight font-bold sm:text-[1.75rem]',
          showVerdictColors ? hero.verdictStyle.colorClass : 'text-slate-800 dark:text-slate-100',
        )}
      >
        {hero.headline}
      </h1>

      {hero.subline ? (
        <p className="text-foreground/85 mt-2 text-sm leading-relaxed">{hero.subline}</p>
      ) : null}

      {hero.actionLine ? (
        <p className="text-foreground mt-3 text-base font-semibold">{hero.actionLine}</p>
      ) : null}

      {hero.adaptationReminders.length > 0 ? (
        <ul className="text-muted-foreground mt-3 space-y-1 text-xs leading-relaxed">
          {hero.adaptationReminders.slice(0, 2).map((item) => (
            <li key={item}>· {item}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5">
        <TodayMetricsRow metricsRow={hero.metricsRow} />
      </div>

      <TwinTrustStrip
        className="mt-4"
        confidenceHref={hero.twinTrustStrip.confidenceHref}
        confidenceLabel={hero.twinTrustStrip.confidenceLabel}
        confidencePctRounded={hero.twinTrustStrip.confidencePctRounded}
        limitingFactorText={hero.twinTrustStrip.limitingFactorText}
      />
    </section>
  );
}

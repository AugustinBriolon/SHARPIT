'use client';

import { TodayMetricsRow } from '@/components/today/dashboard/today-metrics-row';
import { TwinTrustStrip } from '@/components/today/dashboard/twin-trust-strip';
import type { TodayDashboardViewModel } from '@/components/today/dashboard/use-today-dashboard-view-model';
import { buildTopActionLine, shouldShowForwardTrainingCopy } from '@/lib/today-rich-view';
import type { OverallVerdict } from '@/lib/today-mapping';
import { mapVerdictToDisplay } from '@/lib/today-mapping';
import { cn } from '@/lib/utils';

export function TodayVerdictHero({ vm }: { vm: TodayDashboardViewModel }) {
  const narrative = vm.phaseNarrative;
  const phase = vm.dailyPhase?.phase ?? 'MORNING';
  const verdict = (vm.reasoning?.overallVerdict ?? 'INSUFFICIENT_DATA') as OverallVerdict;
  const display = mapVerdictToDisplay(verdict);
  const forward = shouldShowForwardTrainingCopy(phase);
  const actionLine =
    vm.adviceActionable && forward ? buildTopActionLine(vm.reasoning?.topAction ?? null) : null;

  const headline = narrative?.heroHeadline ?? display.label;
  const subline = narrative?.heroSubline ?? vm.insufficientDataMessage ?? '';
  const eyebrow = narrative?.heroEyebrow ?? "Qu'est-ce qui compte aujourd'hui ?";

  const showVerdictColors = forward && vm.adviceActionable;

  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border bg-linear-to-br to-transparent px-5 py-6 sm:px-7 sm:py-7',
        showVerdictColors
          ? display.bgClass
          : 'border-slate-200/80 bg-slate-50/40 dark:border-slate-700/60',
      )}
    >
      <p className="text-muted-foreground mb-1 text-[10px] font-semibold tracking-[0.14em] uppercase">
        {eyebrow}
      </p>
      <h1
        className={cn(
          'font-heading text-2xl leading-tight font-bold sm:text-[1.75rem]',
          showVerdictColors ? display.colorClass : 'text-slate-800 dark:text-slate-100',
        )}
      >
        {headline}
      </h1>
      {subline ? (
        <p className="text-foreground/85 mt-2 text-sm leading-relaxed">{subline}</p>
      ) : null}
      {actionLine ? (
        <p className="text-foreground mt-3 text-base font-semibold">{actionLine}</p>
      ) : null}

      {narrative?.adaptationReminders && narrative.adaptationReminders.length > 0 ? (
        <ul className="text-muted-foreground mt-3 space-y-1 text-xs leading-relaxed">
          {narrative.adaptationReminders.slice(0, 2).map((item) => (
            <li key={item}>· {item}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5">
        <TodayMetricsRow vm={vm} />
      </div>

      <TwinTrustStrip
        className="mt-4"
        confidence={vm.confidence}
        confidenceLabel={vm.confidenceLabel}
        limitingFactor={null}
        reasoning={vm.reasoning}
      />
    </section>
  );
}

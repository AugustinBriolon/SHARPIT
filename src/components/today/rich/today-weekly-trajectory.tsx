'use client';

import Link from 'next/link';
import { Sparkline } from '@/components/today/dashboard/sparkline';
import type { TodayDashboardViewModel } from '@/components/today/dashboard/use-today-dashboard-view-model';
import { buildProgressionSummary, trajectoryEyebrow } from '@/lib/today-rich-view';
import { TRAJECTORY_DRILL_DOWNS, TWIN_DIMENSION_LABEL } from '@/lib/today-twin-navigation';
import { cn } from '@/lib/utils';

export function TodayWeeklyTrajectory({ vm }: { vm: TodayDashboardViewModel }) {
  const phase = vm.dailyPhase?.phase ?? 'MORNING';
  const { weeklyLoad } = vm;
  const progression = buildProgressionSummary(vm.adaptation, weeklyLoad);
  const hasSpark = vm.recoverySpark.some((v) => v != null) || vm.effortSpark.some((v) => v != null);

  return (
    <section className="bg-card rounded-2xl border px-5 py-4 sm:px-6">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase">
            {trajectoryEyebrow(phase)}
          </p>
          <p className="text-foreground mt-1 text-sm font-semibold">
            <span className={cn('mr-1.5', progression.trendClass)}>{progression.trendArrow}</span>
            {progression.headline}
          </p>
          {progression.detail ? (
            <p className="text-muted-foreground mt-0.5 text-xs">{progression.detail}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
          {TRAJECTORY_DRILL_DOWNS.map(({ dimension, href }) => (
            <Link
              key={dimension}
              className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              href={href}
            >
              {TWIN_DIMENSION_LABEL[dimension]}
            </Link>
          ))}
        </div>
      </div>

      {hasSpark ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-muted-foreground mb-1 text-[10px] uppercase">Récup. 14j</p>
            <Sparkline stroke="#10b981" values={vm.recoverySpark} />
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-[10px] uppercase">Charge 14j</p>
            <Sparkline stroke="#3b82f6" values={vm.effortSpark} />
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          Pas encore assez d&apos;historique pour une trajectoire hebdomadaire.
        </p>
      )}
    </section>
  );
}

'use client';

import Link from 'next/link';
import { Sparkline } from '@/components/today/dashboard/sparkline';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { cn } from '@/lib/utils';
import { PhysioRail } from '@/components/ui/physio-rail';

export function TodayWeeklyTrajectory({ vm }: { vm: TodayViewModel }) {
  const t = vm.weeklyTrajectory;
  const recoveryStroke = 'var(--color-chart-1)';
  const loadStroke = 'var(--color-chart-4)';

  return (
    <section className="analysis-panel rounded-analysis-lg px-5 py-4 sm:px-6">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-label">{t.eyebrow}</p>
          <p className="text-foreground mt-1 text-sm font-semibold">
            <span className={cn('mr-1.5', t.trendClass)}>{t.trendArrow}</span>
            {t.headline}
          </p>
          {t.detail ? <p className="text-muted-foreground mt-0.5 text-xs">{t.detail}</p> : null}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
          {t.drillDownLinks.map(({ label, href }) => (
            <Link
              key={href}
              className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
              href={href}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <PhysioRail
          markerLabel="repère visuel de la fenêtre de charge récente"
          max={100}
          value={t.hasSparks ? 50 : null}
        />
      </div>

      {t.hasSparks ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="analysis-panel rounded-analysis px-3 py-3">
            <p className="text-label mb-1">Récup. 14j</p>
            <Sparkline stroke={recoveryStroke} values={t.sparks.recoveryValues} />
          </div>
          <div className="analysis-panel rounded-analysis px-3 py-3">
            <p className="text-label mb-1">Charge 14j</p>
            <Sparkline stroke={loadStroke} values={t.sparks.effortValues} />
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">{t.emptyTrajectoryText}</p>
      )}
    </section>
  );
}

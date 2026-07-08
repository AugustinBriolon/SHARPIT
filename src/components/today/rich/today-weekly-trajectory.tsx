'use client';

import Link from 'next/link';
import { Sparkline } from '@/components/today/dashboard/sparkline';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { cn } from '@/lib/utils';

export function TodayWeeklyTrajectory({ vm }: { vm: TodayViewModel }) {
  const t = vm.weeklyTrajectory;

  return (
    <section className="bg-card rounded-2xl border px-5 py-4 sm:px-6">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase">
            {t.eyebrow}
          </p>
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

      {t.hasSparks ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-muted-foreground mb-1 text-[10px] uppercase">Récup. 14j</p>
            <Sparkline stroke="#10b981" values={t.sparks.recoveryValues} />
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-[10px] uppercase">Charge 14j</p>
            <Sparkline stroke="#3b82f6" values={t.sparks.effortValues} />
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">{t.emptyTrajectoryText}</p>
      )}
    </section>
  );
}

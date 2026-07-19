'use client';

import { cn } from '@/lib/utils';
import { Sparkline } from '@/components/today/dashboard/sparkline';
import type { TodayViewModel } from '@/core/presentation/today-view-model';
import Link from 'next/link';
import { TWIN_DRILL_DOWN } from '@/lib/today-twin-navigation';

/**
 * Trajectory — headline + naked sparklines; titles are drill-downs (no nested panels / link row).
 */
export function TodayWeeklyTrajectory({ vm }: { vm: TodayViewModel }) {
  const t = vm.weeklyTrajectory;
  const recoveryStroke = 'var(--color-chart-1)';
  const loadStroke = 'var(--color-chart-4)';

  return (
    <section className="px-0.5">
      <p className="text-label">{t.eyebrow}</p>
      <p className="text-foreground mt-1 text-sm font-semibold">
        <span className={cn('mr-1.5', t.trendClass)}>{t.trendArrow}</span>
        {t.headline}
      </p>
      {t.detail ? <p className="text-muted-foreground mt-0.5 text-xs">{t.detail}</p> : null}

      {t.hasSparks ? (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <Link
              className="text-label hover:text-foreground mb-1 inline-flex items-center gap-1 transition-colors"
              href={TWIN_DRILL_DOWN.recovery}
            >
              Récup. 14j
              <span className="text-[10px] tracking-wider opacity-70" aria-hidden>
                →
              </span>
            </Link>
            <Sparkline stroke={recoveryStroke} values={t.sparks.recoveryValues} />
          </div>
          <div>
            <Link
              className="text-label hover:text-foreground mb-1 inline-flex items-center gap-1 transition-colors"
              href={TWIN_DRILL_DOWN.effort}
            >
              Charge 14j
              <span className="text-[10px] tracking-wider opacity-70" aria-hidden>
                →
              </span>
            </Link>
            <Sparkline stroke={loadStroke} values={t.sparks.effortValues} />
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground mt-2 text-xs">{t.emptyTrajectoryText}</p>
      )}
    </section>
  );
}

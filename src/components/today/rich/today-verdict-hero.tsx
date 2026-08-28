'use client';

import type { TodayViewModel } from '@/core/presentation/today-view-model';
import { confidenceBarsFromPct } from '@/components/ui/instruments/confidence-bars';
import {
  TodayVerdictActionLine,
  TodayVerdictConfidence,
  TodayVerdictGoalBadge,
  TodayVerdictContextLabel,
  TodayVerdictHeadline,
} from '@/components/today/rich/today-verdict-hero-parts';
import { deriveVerdictHeroDisplay } from '@/components/today/rich/today-verdict-hero-helpers';
import { cn } from '@/lib/utils';

export function TodayVerdictHero({
  loading = false,
  vm,
}: {
  vm: TodayViewModel;
  loading?: boolean;
}) {
  const { hero } = vm;
  const trust = hero.twinTrustStrip;
  const display = deriveVerdictHeroDisplay(hero);
  const bars = confidenceBarsFromPct(loading ? null : trust.confidencePctRounded);

  return (
    <section
      aria-busy={loading || undefined}
      className={cn('surface-ink relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10')}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TodayVerdictContextLabel contextLabel={display.contextLabel} loading={loading} />
        <div className="flex flex-wrap items-center gap-3">
          <TodayVerdictConfidence bars={bars} loading={loading} trust={trust} />
          <TodayVerdictGoalBadge goalLine={hero.goalLine} loading={loading} />
        </div>
      </div>

      <TodayVerdictHeadline headline={hero.headline} loading={loading} />

      <div className="mt-5">
        <TodayVerdictActionLine
          loading={loading}
          secondaryLine={display.secondaryLine}
          secondaryMuted={display.secondaryMuted}
        />
      </div>
    </section>
  );
}

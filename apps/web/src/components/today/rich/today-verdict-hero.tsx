'use client';

import type { TodayViewModel } from '@/presentation/today-view-model';
import { FadeIn } from '@/components/motion';
import { confidenceBarsFromPct } from '@/components/ui/instruments/confidence-bars';
import {
  TodayVerdictActionLine,
  TodayVerdictConfidence,
  TodayVerdictContextLabel,
  TodayVerdictHeadline,
  TodayVerdictLimiter,
} from '@/components/today/rich/today-verdict-hero-parts';
import { deriveVerdictHeroDisplay } from '@/components/today/rich/today-verdict-hero-helpers';
import { TodayReliabilityPanel } from '@/components/today/rich/today-reliability-panel';
import { fadeUpTransition, fadeUpVariants } from '@/client/motion/variants';
import { motionTokens } from '@/client/motion/tokens';
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
  const limiterHref = loading
    ? null
    : (trust.limitingFactorHref ?? vm.navigationTargets.sleep.href);

  return (
    <section
      aria-busy={loading || undefined}
      className={cn('surface-ink relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10')}
    >
      <FadeIn
        variants={fadeUpVariants(motionTokens.distance.xs)}
        transition={{
          ...fadeUpTransition,
          duration: motionTokens.duration.fast,
        }}
      >
        <TodayVerdictContextLabel
          contextLabel={display.contextLabel}
          loading={loading}
          packTier={hero.reliability?.packTier}
        />

        <TodayVerdictHeadline headline={hero.headline} loading={loading} />

        <div className="mt-5">
          <TodayVerdictActionLine
            loading={loading}
            secondaryLine={display.secondaryLine}
            secondaryMuted={display.secondaryMuted}
          />
          <TodayVerdictLimiter cause={display.limiterCause} href={limiterHref} loading={loading} />
        </div>

        <TodayVerdictConfidence
          bars={bars}
          loading={loading}
          packTier={hero.reliability?.packTier}
          trust={trust}
        />

        <TodayReliabilityPanel loading={loading} reliability={hero.reliability} />
      </FadeIn>
    </section>
  );
}

'use client';

import {
  CompositionTrendChart,
  MetricCardsExpand,
  MetricChip,
  TREND_WINDOWS,
  type TrendWindowId,
} from '@/components/corps/composition/composition-view-parts';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import type { CompositionMetricId } from '@/lib/health/composition-metric-guides';
import { cn } from '@/lib/utils';
import type { useBodyPresentationViewModel } from '@/hooks/use-presentation-view-model';

type CompositionVm = NonNullable<ReturnType<typeof useBodyPresentationViewModel>['data']>;

function HeroMeasuredAtRow({ valuesLoading, vm }: { valuesLoading: boolean; vm: CompositionVm }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <p className="text-label text-ink-surface-foreground/65 inline-flex items-center gap-2">
        <span
          className="bg-highlight dark:bg-ink-surface-foreground h-2.5 w-2.5 shrink-0 rounded-full"
          aria-hidden
        />
        Dernière pesée
      </p>
      {valuesLoading ? (
        <SkeletonDataValue
          className="bg-ink-surface-foreground/20"
          heightClassName="h-3"
          widthClassName="w-28"
        />
      ) : (
        <p className="text-data text-ink-surface-foreground/60 text-xs">
          {vm.hero.measuredAtLabel ?? '—'}
          {vm.hero.sourceLabel ? ` · ${vm.hero.sourceLabel}` : ''}
        </p>
      )}
    </div>
  );
}

function HeroWeightValue({ valuesLoading, vm }: { valuesLoading: boolean; vm: CompositionVm }) {
  return (
    <div className="text-verdict text-ink-surface-foreground mt-6 text-[2rem] leading-none sm:text-[2.25rem]">
      {valuesLoading ? (
        <SkeletonDataValue
          className="bg-ink-surface-foreground/20"
          heightClassName="h-10"
          widthClassName="w-28"
        />
      ) : (
        <>
          {vm.hero.latestWeightDisplay}
          {vm.hero.latestWeightKg !== null ? (
            <span className="text-ink-surface-foreground/70 ml-1.5 text-lg font-normal">kg</span>
          ) : null}
        </>
      )}
    </div>
  );
}

function HeroWeightDelta({ valuesLoading, vm }: { valuesLoading: boolean; vm: CompositionVm }) {
  if (valuesLoading) {
    return (
      <div className="border-ink-surface-foreground/20 bg-ink-surface-foreground/6 rounded-analysis mt-3 border px-3 py-2.5">
        <SkeletonDataValue
          className="bg-ink-surface-foreground/20"
          heightClassName="h-4"
          widthClassName="w-24"
        />
      </div>
    );
  }
  if (!vm.hero.weightDeltaDisplay) {
    return null;
  }
  return (
    <p className="border-ink-surface-foreground/20 bg-ink-surface-foreground/6 text-ink-surface-foreground/80 rounded-analysis mt-3 w-fit border px-3 py-2.5 text-sm leading-relaxed font-medium">
      {vm.hero.weightDeltaDisplay}
    </p>
  );
}

function HeroHintsBlock({ heroHints }: { heroHints: { label: string; text: string }[] }) {
  if (heroHints.length === 0) {
    return null;
  }
  return (
    <div className="border-ink-surface-foreground/20 bg-ink-surface-foreground/6 text-ink-surface-foreground/70 rounded-analysis mt-6 w-fit space-y-1 border px-3 py-3 text-xs leading-relaxed">
      {heroHints.map(({ label, text }) => (
        <p key={label}>
          <span className="text-ink-surface-foreground/90 font-medium">{label}</span> — {text}
        </p>
      ))}
    </div>
  );
}

export function CompositionHeroSection({
  heroHints,
  valuesLoading,
  vm,
}: {
  heroHints: { label: string; text: string }[];
  valuesLoading: boolean;
  vm: CompositionVm;
}) {
  return (
    <section
      aria-busy={valuesLoading || undefined}
      className={cn('surface-ink relative overflow-hidden px-5 py-8 sm:px-8 sm:py-10')}
    >
      <HeroMeasuredAtRow valuesLoading={valuesLoading} vm={vm} />
      <HeroWeightValue valuesLoading={valuesLoading} vm={vm} />
      <HeroWeightDelta valuesLoading={valuesLoading} vm={vm} />
      <HeroHintsBlock heroHints={heroHints} />
    </section>
  );
}

export function CompositionMobileSections({
  chartData,
  chartEmptyInWindow,
  selectedWindow,
  setExplainMetricId,
  setTrendWindow,
  trendDelta,
  trendWindow,
  valuesLoading,
  vm,
}: {
  chartData: { date: string; weightKg: number | null }[];
  chartEmptyInWindow: boolean;
  selectedWindow: (typeof TREND_WINDOWS)[number];
  setExplainMetricId: (id: CompositionMetricId) => void;
  setTrendWindow: (id: TrendWindowId) => void;
  trendDelta: string | null;
  trendWindow: TrendWindowId;
  valuesLoading: boolean;
  vm: CompositionVm;
}) {
  return (
    <div className="space-y-4 lg:hidden">
      {!valuesLoading ? (
        <MetricCardsExpand
          cards={vm.trajectoryCards}
          label="Composition"
          onExplain={setExplainMetricId}
        />
      ) : (
        <section className="space-y-2">
          <p className="text-label px-0.5">Composition</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <MetricChip key={i} label="Mesure" tone="neutral" value="" loading />
            ))}
          </div>
        </section>
      )}

      {!valuesLoading && vm.contextCards.length > 0 ? (
        <MetricCardsExpand cards={vm.contextCards} label="Repères" onExplain={setExplainMetricId} />
      ) : null}

      {!valuesLoading && vm.hasBodyScan ? (
        <MetricCardsExpand
          cards={vm.healthScanCards}
          label="Santé de fond"
          onExplain={setExplainMetricId}
        />
      ) : null}

      <section className="space-y-3">
        <CompositionTrendChart
          chartData={chartData}
          chartEmptyInWindow={chartEmptyInWindow}
          selectedWindow={selectedWindow}
          trendDelta={trendDelta}
          trendWindow={trendWindow}
          onTrendWindowChange={setTrendWindow}
        />
      </section>
    </div>
  );
}

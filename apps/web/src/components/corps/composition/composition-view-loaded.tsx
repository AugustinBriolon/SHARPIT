'use client';

import { CompositionMetricExplainer } from '@/components/corps/composition/composition-metric-explainer';
import {
  CompositionDetailList,
  CompositionTrendChart,
  MetricChip,
} from '@/components/corps/composition/composition-view-parts';
import {
  CompositionHeroSection,
  CompositionMobileSections,
} from '@/components/corps/composition/composition-view-sections';
import { CorpsWhyBandeau } from '@/components/corps/corps-why-bandeau';
import { StaggerItem, StaggerList } from '@/components/motion/stagger-list';
import { CorpsDisclaimer } from '@/components/corps/corps-ui';
import type { useCompositionView } from '@/components/corps/composition/use-composition-view';

type CompositionViewState = ReturnType<typeof useCompositionView> & {
  vm: NonNullable<ReturnType<typeof useCompositionView>['vm']>;
};

/**
 * Composition instrument — Plate → Chips → Why → Evidence (DESIGN_LANGUAGE § Composition).
 */
export function CompositionViewLoaded({
  activeExplainer,
  allDetailCards,
  chartData,
  chartEmptyInWindow,
  heroHints,
  heroMiniMetrics,
  selectedWindow,
  setExplainMetricId,
  setTrendWindow,
  trendDelta,
  trendWindow,
  valuesLoading,
  vm,
}: CompositionViewState) {
  return (
    <div className="space-y-3 lg:space-y-4">
      <CompositionHeroSection valuesLoading={valuesLoading} vm={vm} />

      <StaggerList
        aria-label="Signaux de composition"
        className="grid grid-cols-2 gap-2 lg:grid-cols-4"
      >
        {heroMiniMetrics.map(({ key, label, metric, value, delta }) => (
          <StaggerItem key={key}>
            <MetricChip
              delta={valuesLoading ? undefined : delta}
              label={label}
              loading={valuesLoading}
              tone={metric.tone}
              value={value}
              onExplain={
                !valuesLoading && metric.guideId
                  ? () => setExplainMetricId(metric.guideId!)
                  : undefined
              }
            />
          </StaggerItem>
        ))}
      </StaggerList>

      {!valuesLoading ? <CorpsWhyBandeau hints={heroHints} /> : null}

      <CompositionMobileSections
        chartData={chartData}
        chartEmptyInWindow={chartEmptyInWindow}
        selectedWindow={selectedWindow}
        setExplainMetricId={setExplainMetricId}
        setTrendWindow={setTrendWindow}
        trendDelta={trendDelta}
        trendWindow={trendWindow}
        valuesLoading={valuesLoading}
        vm={vm}
      />

      <div className="hidden lg:grid lg:grid-cols-[1.65fr_1fr] lg:items-stretch lg:gap-3">
        <section className="chip-surface rounded-analysis-lg space-y-3 p-4 sm:p-5">
          <CompositionTrendChart
            chartData={chartData}
            chartEmptyInWindow={chartEmptyInWindow}
            selectedWindow={selectedWindow}
            trendDelta={trendDelta}
            trendWindow={trendWindow}
            onTrendWindowChange={setTrendWindow}
          />
        </section>
        <CompositionDetailList cards={allDetailCards} onExplain={setExplainMetricId} />
      </div>

      <CorpsDisclaimer title="Lecture indicative, pas une mesure médicale">
        Impédancemétrie = tendances utiles, écart possible vs DEXA. Hydratation, repas et heure de
        pesée influencent le résultat du jour.
      </CorpsDisclaimer>

      {activeExplainer ? (
        <CompositionMetricExplainer
          explainer={activeExplainer}
          open={true}
          onOpenChange={(open) => !open && setExplainMetricId(null)}
        />
      ) : null}
    </div>
  );
}

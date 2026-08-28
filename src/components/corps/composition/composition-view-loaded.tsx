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
import type { useCompositionView } from '@/components/corps/composition/use-composition-view';
import { CorpsDisclaimer } from '@/components/corps/corps-ui';

type CompositionViewState = ReturnType<typeof useCompositionView> & {
  vm: NonNullable<ReturnType<typeof useCompositionView>['vm']>;
};

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
    <div className="space-y-4 lg:space-y-5">
      <CompositionHeroSection heroHints={heroHints} valuesLoading={valuesLoading} vm={vm} />

      <nav aria-label="Signaux de composition" className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {heroMiniMetrics.map(({ key, label, metric, value, delta }) => (
          <MetricChip
            key={key}
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
        ))}
      </nav>

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

      <div className="hidden lg:grid lg:grid-cols-[1.6fr_1fr] lg:items-stretch lg:gap-4">
        <section className="chip-surface rounded-analysis-lg space-y-3 p-5">
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

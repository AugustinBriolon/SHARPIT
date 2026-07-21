'use client';

import { AdaptationStatsStrip } from '@/components/adaptation/adaptation-stats-strip';
import { AdaptationWhyBlock } from '@/components/adaptation/adaptation-why-block';
import { DrillDownDimensionRow } from '@/components/today/drill-down/dimension-row';
import {
  DataReliabilityFooter,
  MetricDrillDownPage,
  type MetricTone,
} from '@/components/today/drill-down/metric-drill-down-page';
import { PhysioDrillDownHero } from '@/components/today/drill-down/physio-drill-down-hero';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import type { GlobalDecisionContext } from '@/core/presentation/global-decision-context';
import type { DimensionResult } from '@/hooks/use-today';
import { softTintFromQualityClass } from '@/lib/presentation/physio-plate-tint';

export type AdaptationPageViewProps = {
  date: Date;
  isToday?: boolean;
  maxDate?: Date;
  onDateChange?: (date: Date) => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  loading?: boolean;
  adaptationIndex: number | null;
  statusLabel: string;
  statusClassName: string;
  trendLabel: string;
  verdictLabel: string;
  verdictClassName: string;
  verdictKey: string;
  loadMultiplier: number;
  limitingFactor: string | null;
  plateauRisk: boolean;
  overreachingWithoutAdaptation: boolean;
  dimensions: {
    key: string;
    label: string;
    description: string;
    dim: DimensionResult;
  }[];
  availableDimCount: number;
  historyLength: number;
  confidencePct: number;
  confidenceTone: MetricTone;
  globalDecision: GlobalDecisionContext;
};

function limitingScoreFromDimensions(
  limitingFactor: string | null,
  dimensions: AdaptationPageViewProps['dimensions'],
): number | null {
  if (!limitingFactor) return null;
  const match = dimensions.find((d) => d.label === limitingFactor);
  if (!match?.dim.available || match.dim.score == null) return null;
  return match.dim.score;
}

export function AdaptationPageView({
  date,
  isToday,
  maxDate,
  onDateChange,
  onPreviousDay,
  onNextDay,
  loading = false,
  adaptationIndex,
  statusLabel,
  statusClassName,
  trendLabel,
  verdictKey,
  loadMultiplier,
  limitingFactor,
  plateauRisk,
  overreachingWithoutAdaptation,
  dimensions,
  availableDimCount,
  historyLength,
  confidencePct,
  globalDecision,
}: AdaptationPageViewProps) {
  const limitingScore = loading ? null : limitingScoreFromDimensions(limitingFactor, dimensions);

  const neuromuscular = dimensions.find((d) => d.key === 'neuromuscularEfficiency');
  const neuromuscularMissing = !loading && neuromuscular != null && !neuromuscular.dim.available;
  const displayDimensions = loading
    ? dimensions.filter((d) => d.key !== 'neuromuscularEfficiency')
    : dimensions.filter((d) => {
        if (d.key === 'neuromuscularEfficiency' && !d.dim.available) return false;
        return true;
      });

  const freinDimension =
    !loading && limitingFactor != null
      ? (displayDimensions.find((d) => d.label === limitingFactor) ?? null)
      : null;
  const otherDimensions = displayDimensions.filter((d) => d !== freinDimension);

  let actionLine: string | null = null;
  if (!loading) {
    if (limitingFactor) {
      actionLine =
        limitingScore != null
          ? `Limité par · ${limitingFactor} (${Math.round(limitingScore)})`
          : `Limité par · ${limitingFactor}`;
    } else if (trendLabel && trendLabel !== '—') {
      actionLine = trendLabel;
    }
  }

  return (
    <MetricDrillDownPage
      footer={
        <DataReliabilityFooter
          completenessLabel={`${historyLength} jours d’historique`}
          confidencePct={confidencePct}
          dimensionCount={availableDimCount}
          dimensionTotal={4}
          loading={loading}
        />
      }
    >
      <PhysioDrillDownHero
        confidencePct={confidencePct}
        date={date}
        headline={statusLabel}
        headlineClassName={statusClassName}
        isToday={isToday}
        loading={loading}
        maxDate={maxDate}
        panelClassName={loading ? undefined : softTintFromQualityClass(statusClassName)}
        quickReadCaption={actionLine ?? undefined}
        quickReadLabel="indice d'adaptation"
        quickReadSuffix="%"
        quickReadValue={adaptationIndex != null ? String(Math.round(adaptationIndex)) : '—'}
        railValue={adaptationIndex}
        onDateChange={onDateChange}
        onNextDay={onNextDay}
        onPreviousDay={onPreviousDay}
      />

      <AdaptationStatsStrip
        limitingFactor={limitingFactor}
        limitingScore={limitingScore}
        loading={loading}
        loadMultiplier={loadMultiplier}
        trendLabel={trendLabel}
      />

      <AdaptationWhyBlock
        adaptationIndex={adaptationIndex}
        globalDecision={globalDecision}
        historyLength={historyLength}
        limitingFactor={limitingFactor}
        limitingScore={limitingScore}
        loading={loading}
        loadMultiplier={loadMultiplier}
        overreachingWithoutAdaptation={overreachingWithoutAdaptation}
        plateauRisk={plateauRisk}
        statusLabel={statusLabel}
        trendLabel={trendLabel}
        verdictKey={verdictKey}
      />

      <section className="px-0.5">
        <DrillDownSectionLabel>Dimensions</DrillDownSectionLabel>
        <div className="mt-3 space-y-4">
          {[...(freinDimension ? [freinDimension] : []), ...otherDimensions].map((d) => (
            <DrillDownDimensionRow
              key={d.key}
              description={d.description}
              dim={d.dim}
              emphasized={!loading && freinDimension != null && d.key === freinDimension.key}
              label={d.label}
              loading={loading}
              protectiveTone
            />
          ))}
        </div>
        {neuromuscularMissing ? (
          <p className="annotation-clinical mt-4">
            Efficacité neuromusculaire indisponible — moyenne de dérive FC sur 14 jours. Il faut au
            moins une sortie course/vélo ≥ 30 min avec stream FC + vitesse GPS (ou puissance) dans
            cette fenêtre.
          </p>
        ) : null}
      </section>
    </MetricDrillDownPage>
  );
}

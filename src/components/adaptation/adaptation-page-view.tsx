'use client';

import { AdaptationReadingSection } from '@/components/adaptation/adaptation-reading-section';
import { DrillDownDimensionRow } from '@/components/today/drill-down/dimension-row';
import { GlobalDecisionStrip } from '@/components/today/drill-down/global-decision-strip';
import {
  DataReliabilityFooter,
  MetricDrillDownPage,
  type MetricTone,
} from '@/components/today/drill-down/metric-drill-down-page';
import { PhysioDrillDownHero } from '@/components/today/drill-down/physio-drill-down-hero';
import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import type { GlobalDecisionContext } from '@/core/presentation/global-decision-context';
import type { DimensionResult } from '@/hooks/use-today';

export type AdaptationPageViewProps = {
  date: Date;
  isToday?: boolean;
  maxDate?: Date;
  onDateChange?: (date: Date) => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
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
  adaptationIndex,
  statusLabel,
  statusClassName,
  trendLabel,
  verdictLabel,
  verdictClassName,
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
  const limitingScore = limitingScoreFromDimensions(limitingFactor, dimensions);

  const neuromuscular = dimensions.find((d) => d.key === 'neuromuscularEfficiency');
  const neuromuscularMissing = neuromuscular != null && !neuromuscular.dim.available;
  const visibleDimensions = dimensions.filter((d) => {
    if (d.key === 'neuromuscularEfficiency' && !d.dim.available) return false;
    return true;
  });

  return (
    <MetricDrillDownPage
      footer={
        <DataReliabilityFooter
          completenessLabel={`${historyLength} jours d’historique`}
          confidencePct={confidencePct}
          dimensionCount={availableDimCount}
          dimensionTotal={4}
        />
      }
    >
      <PhysioDrillDownHero
        date={date}
        headline={statusLabel}
        headlineClassName={statusClassName}
        isToday={isToday}
        maxDate={maxDate}
        quickReadCaption={trendLabel}
        quickReadLabel="indice d'adaptation"
        quickReadSuffix="%"
        quickReadValue={adaptationIndex != null ? String(Math.round(adaptationIndex)) : '—'}
        railValue={adaptationIndex}
        subline="Modèle d'adaptation"
        onDateChange={onDateChange}
        onNextDay={onNextDay}
        onPreviousDay={onPreviousDay}
      />

      <GlobalDecisionStrip context={globalDecision} />

      <AdaptationReadingSection
        adaptationIndex={adaptationIndex}
        historyLength={historyLength}
        limitingFactor={limitingFactor}
        limitingScore={limitingScore}
        loadMultiplier={loadMultiplier}
        overreachingWithoutAdaptation={overreachingWithoutAdaptation}
        plateauRisk={plateauRisk}
        statusLabel={statusLabel}
        trendLabel={trendLabel}
        verdictClassName={verdictClassName}
        verdictKey={verdictKey}
        verdictLabel={verdictLabel}
      />

      <DrillDownSectionCard>
        <DrillDownSectionLabel>Dimensions</DrillDownSectionLabel>
        <div className="mt-4 space-y-4">
          {visibleDimensions.map((d) => (
            <DrillDownDimensionRow
              key={d.key}
              description={d.description}
              dim={d.dim}
              label={d.label}
            />
          ))}
        </div>
        {neuromuscularMissing ? (
          <p className="annotation-clinical mt-4">
            Efficacité neuromusculaire indisponible — nécessite des sorties course/vélo ≥ 30 min
            avec FC (et streams synchronisés).
          </p>
        ) : null}
      </DrillDownSectionCard>
    </MetricDrillDownPage>
  );
}

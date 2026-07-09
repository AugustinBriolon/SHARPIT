'use client';

import { PhysioDrillDownHero } from '@/components/today/drill-down/physio-drill-down-hero';
import { DrillDownDimensionRow } from '@/components/today/drill-down/dimension-row';
import { DrillDownHighlightSection } from '@/components/today/drill-down/highlight-section';
import { InsightNarrative } from '@/components/product-insight/insight-narrative';
import type { ProductInsightBundle } from '@/core/product-insight/types';
import { defaultInsightNarrativeSections } from '@/lib/product-insight/narrative-sections';
import { DrillDownSectionCard } from '@/components/today/drill-down/section-card';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import {
  DataReliabilityFooter,
  MetricDrillDownPage,
  type MetricTone,
} from '@/components/today/drill-down/metric-drill-down-page';
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
  loadMultiplier: number;
  rationale: string[];
  keyEvidence: string[];
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
  insights: ProductInsightBundle;
};

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
  loadMultiplier,
  rationale,
  keyEvidence,
  limitingFactor,
  plateauRisk,
  overreachingWithoutAdaptation,
  dimensions,
  availableDimCount,
  historyLength,
  confidencePct,
  insights,
}: AdaptationPageViewProps) {
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

      <DrillDownHighlightSection
        bullets={rationale}
        description="La meilleure façon d'ajuster le bloc à partir de ce que le modèle voit."
        label="Décision de progression"
        title={verdictLabel}
        titleClassName={verdictClassName}
      />

      <InsightNarrative sections={defaultInsightNarrativeSections(insights)} />

      {(plateauRisk || overreachingWithoutAdaptation || limitingFactor) && (
        <DrillDownSectionCard>
          <DrillDownSectionLabel>Ce qui freine le bloc</DrillDownSectionLabel>
          <ul className="text-foreground mt-3 space-y-2 text-sm leading-relaxed">
            {limitingFactor ? <li>· {limitingFactor}</li> : null}
            {plateauRisk ? <li>· Risque de plateau détecté</li> : null}
            {overreachingWithoutAdaptation ? (
              <li>· Surcharge sans adaptation correspondante</li>
            ) : null}
          </ul>
        </DrillDownSectionCard>
      )}

      <DrillDownSectionCard>
        <DrillDownSectionLabel>Ce qui nourrit ou freine l&apos;adaptation</DrillDownSectionLabel>
        <div className="mt-4 space-y-4">
          {dimensions.map((d) => (
            <DrillDownDimensionRow
              key={d.key}
              description={d.description}
              dim={d.dim}
              label={d.label}
            />
          ))}
        </div>
      </DrillDownSectionCard>

      {keyEvidence.length > 0 ? (
        <DrillDownSectionCard>
          <DrillDownSectionLabel>Pourquoi cette lecture</DrillDownSectionLabel>
          <ul className="text-muted-foreground mt-3 space-y-1.5 text-sm leading-relaxed">
            {keyEvidence.map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
          {loadMultiplier !== 1 ? (
            <p className="text-muted-foreground mt-3 text-xs">
              Multiplicateur de charge suggéré : ×{loadMultiplier.toFixed(2)}
            </p>
          ) : null}
        </DrillDownSectionCard>
      ) : null}
    </MetricDrillDownPage>
  );
}

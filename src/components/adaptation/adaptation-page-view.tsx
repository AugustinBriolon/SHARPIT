'use client';

import { DrillDownHero } from '@/components/today/drill-down/hero';
import { DrillDownDimensionRow } from '@/components/today/drill-down/dimension-row';
import { DrillDownHighlightSection } from '@/components/today/drill-down/highlight-section';
import { InsightList } from '@/components/product-insight/insight-list';
import type { ProductInsightBundle } from '@/core/product-insight/types';
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
      <DrillDownHero
        date={date}
        format="percent"
        isToday={isToday}
        max={100}
        maxDate={maxDate}
        primaryCaption={trendLabel}
        score={adaptationIndex}
        statusClassName={statusClassName}
        statusLabel={statusLabel}
        subtitle="Modèle d’adaptation"
        onDateChange={onDateChange}
        onNextDay={onNextDay}
        onPreviousDay={onPreviousDay}
      />

      <DrillDownHighlightSection
        bullets={rationale}
        description="La meilleure facon d'ajuster le bloc a partir de ce que le modele voit."
        label="Décision de progression"
        title={verdictLabel}
        titleClassName={verdictClassName}
      />

      <InsightList insights={insights.primary} label="Lecture primaire du bloc" />

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

      <InsightList insights={insights.supporting} label="Freins et leviers" />

      <DrillDownSectionCard>
        <DrillDownSectionLabel>Ce qui nourrit ou freine l'adaptation</DrillDownSectionLabel>
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

      <InsightList insights={insights.contextual} label="Contexte utile" />
    </MetricDrillDownPage>
  );
}

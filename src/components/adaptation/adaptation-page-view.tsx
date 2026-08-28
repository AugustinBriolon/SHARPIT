'use client';

import { AdaptationMarkers } from '@/components/adaptation/blocks/adaptation-markers';
import {
  DrillDownAlertSection,
  type DrillDownAlert,
} from '@/components/today/drill-down/alert-section';
import { DrillDownDimensionRow } from '@/components/today/drill-down/dimension-row';
import {
  DataReliabilityFooter,
  MetricDrillDownPage,
  type MetricTone,
} from '@/components/today/drill-down/metric-drill-down-page';
import { PhysioDrillDownHero } from '@/components/today/drill-down/physio-drill-down-hero';
import { DrillDownSectionLabel } from '@/components/today/drill-down/section-label';
import type { DimensionResult } from '@/hooks/use-today';

export type AdaptationPageViewProps = {
  date: Date;
  isToday?: boolean;
  maxDate?: Date;
  minDate?: Date;
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
};

function limitingScoreFromDimensions(
  limitingFactor: string | null,
  dimensions: AdaptationPageViewProps['dimensions'],
): number | null {
  if (!limitingFactor) {
    return null;
  }
  const match = dimensions.find((d) => d.label === limitingFactor);
  if (!match?.dim.available || match.dim.score === null) {
    return null;
  }
  return match.dim.score;
}

function buildAdaptationAlerts(
  loading: boolean,
  plateauRisk: boolean,
  overreachingWithoutAdaptation: boolean,
): DrillDownAlert[] {
  if (loading) {
    return [];
  }
  return (
    [
      plateauRisk && {
        colorClass: 'text-signal-caution',
        label: 'ton adaptation stagne sur la fenêtre récente.',
        prefix: 'Plateau',
      },
      overreachingWithoutAdaptation && {
        colorClass: 'text-signal-risk',
        label: 'charge haute sans réponse adaptative en face.',
        prefix: 'Surcharge sans gain',
        tone: 'risk',
      },
    ] as (DrillDownAlert | false)[]
  ).filter((alert): alert is DrillDownAlert => alert !== false);
}

function filterDisplayDimensions(
  dimensions: AdaptationPageViewProps['dimensions'],
  loading: boolean,
) {
  if (loading) {
    return dimensions.filter((d) => d.key !== 'neuromuscularEfficiency');
  }
  return dimensions.filter((d) => {
    if (d.key === 'neuromuscularEfficiency' && !d.dim.available) {
      return false;
    }
    return true;
  });
}

function resolveFreinDimensions(
  displayDimensions: AdaptationPageViewProps['dimensions'],
  loading: boolean,
  limitingFactor: string | null,
) {
  const freinDimension =
    !loading && limitingFactor !== null
      ? (displayDimensions.find((d) => d.label === limitingFactor) ?? null)
      : null;
  const otherDimensions = displayDimensions.filter((d) => d !== freinDimension);
  return { freinDimension, otherDimensions };
}

function AdaptationDimensionList({
  freinDimension,
  otherDimensions,
  loading,
}: {
  freinDimension: AdaptationPageViewProps['dimensions'][number] | null;
  otherDimensions: AdaptationPageViewProps['dimensions'];
  loading: boolean;
}) {
  return (
    <div className="mt-3 space-y-4">
      {[...(freinDimension ? [freinDimension] : []), ...otherDimensions].map((d) => (
        <DrillDownDimensionRow
          key={d.key}
          description={d.description}
          dim={d.dim}
          emphasized={!loading && freinDimension !== null && d.key === freinDimension.key}
          label={d.label}
          loading={loading}
          protectiveTone
        />
      ))}
    </div>
  );
}

function deriveNeuromuscularMissing(
  isLoading: boolean,
  dimensions: AdaptationPageViewProps['dimensions'],
): boolean {
  if (isLoading) {
    return false;
  }
  const neuromuscular = dimensions.find((d) => d.key === 'neuromuscularEfficiency');
  return neuromuscular !== undefined && !neuromuscular.dim.available;
}

function deriveActionLine(isLoading: boolean, trendLabel: string): string | null {
  if (isLoading || !trendLabel || trendLabel === '—') {
    return null;
  }
  return trendLabel;
}

function deriveAdaptationPageState(props: AdaptationPageViewProps) {
  const {
    loading,
    limitingFactor,
    plateauRisk,
    overreachingWithoutAdaptation,
    dimensions,
    trendLabel,
  } = props;
  const limitingScore = loading ? null : limitingScoreFromDimensions(limitingFactor, dimensions);
  const isLoading = loading ?? false;
  const alerts = buildAdaptationAlerts(
    isLoading,
    plateauRisk ?? false,
    overreachingWithoutAdaptation ?? false,
  );
  const displayDimensions = filterDisplayDimensions(dimensions, isLoading);
  const { freinDimension, otherDimensions } = resolveFreinDimensions(
    displayDimensions,
    isLoading,
    limitingFactor,
  );
  return {
    limitingScore,
    alerts,
    neuromuscularMissing: deriveNeuromuscularMissing(isLoading, dimensions),
    freinDimension,
    otherDimensions,
    actionLine: deriveActionLine(isLoading, trendLabel),
  };
}

export function AdaptationPageView(props: AdaptationPageViewProps) {
  const {
    date,
    isToday,
    maxDate,
    minDate,
    onDateChange,
    onPreviousDay,
    onNextDay,
    loading = false,
    adaptationIndex,
    statusLabel,
    statusClassName,
    loadMultiplier,
    limitingFactor,
    availableDimCount,
    historyLength,
    confidencePct,
  } = props;
  const {
    limitingScore,
    alerts,
    neuromuscularMissing,
    freinDimension,
    otherDimensions,
    actionLine,
  } = deriveAdaptationPageState(props);

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
        eyebrow="Adaptation"
        headline={statusLabel}
        headlineClassName={statusClassName}
        isToday={isToday}
        loading={loading}
        maxDate={maxDate}
        minDate={minDate}
        quickReadCaption={actionLine ?? undefined}
        quickReadLabel="indice d'adaptation"
        quickReadSuffix="%"
        quickReadValue={adaptationIndex !== null ? String(Math.round(adaptationIndex)) : '—'}
        railValue={adaptationIndex}
        onDateChange={onDateChange}
        onNextDay={onNextDay}
        onPreviousDay={onPreviousDay}
      />

      {!loading ? (
        <AdaptationMarkers
          limitingFactor={limitingFactor}
          limitingScore={limitingScore}
          loadMultiplier={loadMultiplier}
        />
      ) : null}

      <DrillDownAlertSection alerts={alerts} />

      <section className="px-0.5">
        <DrillDownSectionLabel>Dimensions</DrillDownSectionLabel>
        <AdaptationDimensionList
          freinDimension={freinDimension}
          loading={loading}
          otherDimensions={otherDimensions}
        />
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

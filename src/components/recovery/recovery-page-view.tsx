'use client';

import { RecoveryAlertsSection } from '@/components/recovery/blocks/recovery-alerts-section';
import { RecoveryDimensionsSection } from '@/components/recovery/blocks/recovery-dimensions-section';
import { RecoveryEvidenceSection } from '@/components/recovery/blocks/recovery-evidence-section';
import { RecoveryHero } from '@/components/recovery/blocks/recovery-hero';
import { RecoverySignalsSection } from '@/components/recovery/blocks/recovery-signals-section';
import { RecoveryStatsStrip } from '@/components/recovery/blocks/recovery-stats-strip';
import { RecoveryWhyBlock } from '@/components/recovery/blocks/recovery-why-block';
import {
  DataReliabilityFooter,
  MetricDrillDownPage,
  type MetricTone,
} from '@/components/today/drill-down/metric-drill-down-page';
import { Skeleton } from '@/components/ui/skeleton';
import type { DimensionResult } from '@/hooks/use-today';
import dynamic from 'next/dynamic';

const RecoveryTrendsSection = dynamic(
  () =>
    import('@/components/recovery/blocks/recovery-trends-section').then(
      (mod) => mod.RecoveryTrendsSection,
    ),
  { ssr: false, loading: () => <Skeleton className="h-48 w-full" /> },
);

export type RecoveryPageViewProps = {
  date: Date;
  isToday?: boolean;
  maxDate?: Date;
  onDateChange?: (date: Date) => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  loading?: boolean;
  readinessScore: number | null;
  signal: { label: string; qualityClass: string; arrow: string };
  limiterLabel: string | null;
  estimatedRecoveryDays: number | null;
  isCalibrating: boolean;
  availableDimCount: number;
  dimensions: Record<string, DimensionResult>;
  intensityLabel: string;
  intensityClassName: string;
  rationale: string[];
  autonomicLabel: string;
  autonomicClass: string;
  wellnessLabel: string;
  wellnessClass: string;
  loadLabel: string;
  loadClass: string;
  dissonanceDetected: boolean;
  sparkHrv: { date: string; value: number | null }[];
  sparkRhr: { date: string; value: number | null }[];
  dualData: { date: string; a: number | null; b: number | null }[];
  baselineLow: number | null;
  baselineHigh: number | null;
  hrv: number | null;
  restingHr: number | null;
  bodyBattery: number | null;
  confidencePct: number;
  confidenceTone: MetricTone;
  completenessLabel: string;
  overreaching?: { label: string; colorClass: string };
  illness?: { label: string; colorClass: string };
};

export function RecoveryPageView(props: RecoveryPageViewProps) {
  const {
    date,
    isToday,
    maxDate,
    onDateChange,
    onPreviousDay,
    onNextDay,
    loading = false,
    readinessScore,
    signal,
    limiterLabel,
    estimatedRecoveryDays,
    isCalibrating,
    availableDimCount,
    dimensions,
    intensityLabel,
    intensityClassName,
    rationale,
    autonomicLabel,
    wellnessLabel,
    loadLabel,
    dissonanceDetected,
    sparkHrv,
    sparkRhr,
    dualData,
    baselineLow,
    baselineHigh,
    hrv,
    restingHr,
    bodyBattery,
    confidencePct,
    completenessLabel,
    overreaching,
    illness,
  } = props;

  return (
    <MetricDrillDownPage
      footer={
        <DataReliabilityFooter
          completenessLabel={completenessLabel}
          confidencePct={confidencePct}
          dimensionCount={availableDimCount}
          dimensionTotal={4}
          loading={loading}
        />
      }
    >
      <RecoveryHero
        availableDimCount={availableDimCount}
        confidencePct={confidencePct}
        date={date}
        estimatedRecoveryDays={estimatedRecoveryDays}
        isCalibrating={isCalibrating}
        isToday={isToday}
        limiterLabel={limiterLabel}
        loading={loading}
        maxDate={maxDate}
        readinessScore={readinessScore}
        signal={signal}
        onDateChange={onDateChange}
        onNextDay={onNextDay}
        onPreviousDay={onPreviousDay}
      />

      <RecoveryStatsStrip
        bodyBattery={bodyBattery}
        hrv={hrv}
        loading={loading}
        restingHr={restingHr}
      />

      <RecoveryWhyBlock
        intensityClassName={intensityClassName}
        intensityLabel={intensityLabel}
        limiterLabel={limiterLabel}
        loading={loading}
        rationale={rationale}
      />

      {!loading ? (
        <RecoverySignalsSection
          autonomicLabel={autonomicLabel}
          dissonanceDetected={dissonanceDetected}
          loadLabel={loadLabel}
          wellnessLabel={wellnessLabel}
        />
      ) : null}

      <RecoveryDimensionsSection dimensions={dimensions} loading={loading} />

      {!loading ? (
        <>
          <RecoveryTrendsSection
            baselineHigh={baselineHigh}
            baselineLow={baselineLow}
            dualData={dualData}
            sparkHrv={sparkHrv}
            sparkRhr={sparkRhr}
          />

          <RecoveryAlertsSection illness={illness} overreaching={overreaching} />

          <RecoveryEvidenceSection
            intensityLabel={intensityLabel}
            limiterLabel={limiterLabel}
            readinessScore={readinessScore}
          />
        </>
      ) : null}
    </MetricDrillDownPage>
  );
}

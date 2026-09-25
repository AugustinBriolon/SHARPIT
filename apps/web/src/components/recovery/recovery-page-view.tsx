'use client';

import { RecoveryAlertsSection } from '@/components/recovery/blocks/recovery-alerts-section';
import { RecoveryDimensionsSection } from '@/components/recovery/blocks/recovery-dimensions-section';
import { RecoveryHero } from '@/components/recovery/blocks/recovery-hero';
import { RecoveryMarkers } from '@/components/recovery/blocks/recovery-markers';
import { RecoveryStatsStrip } from '@/components/recovery/blocks/recovery-stats-strip';
import {
  DataReliabilityFooter,
  MetricDrillDownPage,
  type MetricTone,
} from '@/components/today/drill-down/metric-drill-down-page';
import type { DimensionResult } from '@/hooks/use-today';

export type RecoveryPageViewProps = {
  date: Date;
  isToday?: boolean;
  maxDate?: Date;
  minDate?: Date;
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
    minDate,
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
        intensityLabel={intensityLabel}
        isCalibrating={isCalibrating}
        isToday={isToday}
        limiterLabel={limiterLabel}
        loading={loading}
        maxDate={maxDate}
        minDate={minDate}
        readinessScore={readinessScore}
        signal={signal}
        onDateChange={onDateChange}
        onNextDay={onNextDay}
        onPreviousDay={onPreviousDay}
      />

      {loading ? (
        <RecoveryStatsStrip bodyBattery={null} hrv={null} restingHr={null} loading />
      ) : (
        <RecoveryMarkers
          baselineHigh={baselineHigh}
          baselineLow={baselineLow}
          batterySeries={dualData.map((point) => ({ date: point.date, value: point.a }))}
          bodyBattery={bodyBattery}
          hrv={hrv}
          restingHr={restingHr}
          sparkHrv={sparkHrv}
          sparkRhr={sparkRhr}
        />
      )}

      {/* Alerts stay open: an illness or overreaching signal is the reason to have
          opened this screen at all, and folding it would bury the exception. */}
      {!loading ? (
        <RecoveryAlertsSection
          dissonanceDetected={dissonanceDetected}
          illness={illness}
          overreaching={overreaching}
        />
      ) : null}

      {!loading ? (
        <>
          <RecoveryDimensionsSection dimensions={dimensions} loading={false} />
        </>
      ) : null}
    </MetricDrillDownPage>
  );
}

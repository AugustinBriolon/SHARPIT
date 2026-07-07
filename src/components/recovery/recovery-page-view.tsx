import type { DimensionResult } from '@/hooks/use-today';
import { RecoveryAlertsSection } from '@/components/recovery/recovery-alerts-section';
import { RecoveryDecisionSection } from '@/components/recovery/recovery-decision-section';
import { RecoveryDimensionsSection } from '@/components/recovery/recovery-dimensions-section';
import { RecoveryHero } from '@/components/recovery/recovery-hero';
import { RecoverySignalsSection } from '@/components/recovery/recovery-signals-section';
import { RecoveryStatsStrip } from '@/components/recovery/recovery-stats-strip';
import { RecoveryEvidenceSection } from '@/components/recovery/recovery-evidence-section';
import { RecoveryTrendsSection } from '@/components/recovery/recovery-trends-section';
import {
  DataReliabilityFooter,
  MetricDrillDownPage,
  type MetricTone,
} from '@/components/today/drill-down/metric-drill-down-page';

export type RecoveryPageViewProps = {
  date: Date;
  isToday?: boolean;
  maxDate?: Date;
  onDateChange?: (date: Date) => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
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
  keyEvidence: string[];
};

export function RecoveryPageView(props: RecoveryPageViewProps) {
  const {
    date,
    isToday,
    maxDate,
    onDateChange,
    onPreviousDay,
    onNextDay,
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
    autonomicClass,
    wellnessLabel,
    wellnessClass,
    loadLabel,
    loadClass,
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
    confidenceTone,
    completenessLabel,
    overreaching,
    illness,
    keyEvidence,
  } = props;

  return (
    <MetricDrillDownPage
      footer={
        <DataReliabilityFooter
          completenessLabel={completenessLabel}
          confidencePct={confidencePct}
          dimensionCount={availableDimCount}
          dimensionTotal={4}
        />
      }
    >
      <RecoveryHero
        availableDimCount={availableDimCount}
        date={date}
        estimatedRecoveryDays={estimatedRecoveryDays}
        isCalibrating={isCalibrating}
        isToday={isToday}
        limiterLabel={limiterLabel}
        maxDate={maxDate}
        readinessScore={readinessScore}
        signal={signal}
        onDateChange={onDateChange}
        onNextDay={onNextDay}
        onPreviousDay={onPreviousDay}
      />

      <RecoveryStatsStrip
        bodyBattery={bodyBattery}
        confidencePct={confidencePct}
        confidenceTone={confidenceTone}
        hrv={hrv}
        restingHr={restingHr}
      />

      <RecoveryDimensionsSection dimensions={dimensions} />

      <RecoveryDecisionSection
        intensityClassName={intensityClassName}
        intensityLabel={intensityLabel}
        rationale={rationale}
      />

      <RecoverySignalsSection
        autonomicClass={autonomicClass}
        autonomicLabel={autonomicLabel}
        dissonanceDetected={dissonanceDetected}
        loadClass={loadClass}
        loadLabel={loadLabel}
        wellnessClass={wellnessClass}
        wellnessLabel={wellnessLabel}
      />

      <RecoveryTrendsSection
        baselineHigh={baselineHigh}
        baselineLow={baselineLow}
        dualData={dualData}
        sparkHrv={sparkHrv}
        sparkRhr={sparkRhr}
      />

      <RecoveryAlertsSection illness={illness} overreaching={overreaching} />

      <RecoveryEvidenceSection lines={keyEvidence} />
    </MetricDrillDownPage>
  );
}

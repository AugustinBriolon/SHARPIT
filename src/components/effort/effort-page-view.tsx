import type { DimensionResult } from '@/hooks/use-today';
import { EffortAcwrSection } from '@/components/effort/effort-acwr-section';
import { EffortAlertsSection } from '@/components/effort/effort-alerts-section';
import { EffortCapacitySection } from '@/components/effort/effort-capacity-section';
import {
  EffortPmcSection,
  EffortWeeklyTssSection,
} from '@/components/effort/effort-charts-section';
import { EffortDimensionsSection } from '@/components/effort/effort-dimensions-section';
import { EffortDominantSection } from '@/components/effort/effort-dominant-section';
import { EffortEvidenceSection } from '@/components/effort/effort-evidence-section';
import { EffortHero } from '@/components/effort/effort-hero';
import { EffortStatsStrip } from '@/components/effort/effort-stats-strip';
import { EffortVerdictSection } from '@/components/effort/effort-verdict-section';
import {
  DataReliabilityFooter,
  MetricDrillDownPage,
  type MetricTone,
} from '@/components/today/drill-down/metric-drill-down-page';
import type { FatigueType, TrainingCapacity } from '@/lib/today-mapping';

export type EffortPageViewProps = {
  date: Date;
  isToday?: boolean;
  maxDate?: Date;
  onDateChange?: (date: Date) => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  dailyLoad: number;
  weeklyLoad: number;
  fatigueType: FatigueType | string;
  performancePercent: number | null;
  consecutiveDays: number;
  estimatedDaysToFresh: number | null;
  acwr: number;
  chronicWeeklyAvg: number | null;
  tsb: number | null;
  confidencePct: number;
  confidenceTone: MetricTone;
  verdict: string;
  verdictClass: string;
  verdictKey: string;
  rationale: string[];
  trainingCapacity: TrainingCapacity;
  dimensions: Record<string, DimensionResult>;
  missingDimCount: number;
  dominantDimension: string | null;
  primaryLimitingFactor: string | null;
  isLowFatigue: boolean;
  pmcSeries: { label: string; ctl: number; atl: number; tsb: number }[];
  weeklyTss: { week: string; tss: number }[];
  avgWeeklyTss: number;
  overreaching?: { label: string; colorClass: string };
  keyEvidence: string[];
  completenessLabel: string;
  availableDimCount: number;
};

export function EffortPageView(props: EffortPageViewProps) {
  const {
    date,
    isToday,
    maxDate,
    onDateChange,
    onPreviousDay,
    onNextDay,
    dailyLoad,
    weeklyLoad,
    fatigueType,
    performancePercent,
    consecutiveDays,
    estimatedDaysToFresh,
    acwr,
    chronicWeeklyAvg,
    tsb,
    confidencePct,
    confidenceTone,
    verdict,
    verdictClass,
    verdictKey,
    rationale,
    trainingCapacity,
    dimensions,
    missingDimCount,
    dominantDimension,
    primaryLimitingFactor,
    isLowFatigue,
    pmcSeries,
    weeklyTss,
    avgWeeklyTss,
    overreaching,
    keyEvidence,
    completenessLabel,
    availableDimCount,
  } = props;

  return (
    <MetricDrillDownPage
      footer={
        <DataReliabilityFooter
          completenessLabel={completenessLabel}
          confidencePct={confidencePct}
          dimensionCount={availableDimCount}
          dimensionTotal={5}
        />
      }
    >
      <EffortHero
        consecutiveDays={consecutiveDays}
        dailyLoad={dailyLoad}
        date={date}
        estimatedDaysToFresh={estimatedDaysToFresh}
        fatigueType={fatigueType}
        isToday={isToday}
        maxDate={maxDate}
        performancePercent={performancePercent}
        onDateChange={onDateChange}
        onNextDay={onNextDay}
        onPreviousDay={onPreviousDay}
      />

      <EffortStatsStrip
        acwr={acwr}
        confidencePct={confidencePct}
        confidenceTone={confidenceTone}
        tsb={tsb}
        weeklyTss={weeklyLoad}
      />

      <EffortVerdictSection
        rationale={rationale}
        verdict={verdict}
        verdictClass={verdictClass}
        verdictKey={verdictKey}
      />

      <EffortCapacitySection trainingCapacity={trainingCapacity} />

      <EffortAcwrSection acwr={acwr} chronicWeeklyAvg={chronicWeeklyAvg} weeklyLoad={weeklyLoad} />

      <EffortDimensionsSection dimensions={dimensions} missingCount={missingDimCount} />

      <EffortDominantSection
        dominantDimension={dominantDimension}
        isLowFatigue={isLowFatigue}
        primaryLimitingFactor={primaryLimitingFactor}
      />

      <EffortPmcSection data={pmcSeries} />

      <EffortWeeklyTssSection avgWeeklyTss={avgWeeklyTss} data={weeklyTss} />

      <EffortAlertsSection overreaching={overreaching} />

      <EffortEvidenceSection lines={keyEvidence} />
    </MetricDrillDownPage>
  );
}

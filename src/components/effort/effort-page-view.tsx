import { EffortAlertsSection } from '@/components/effort/effort-alerts-section';
import {
  EffortPmcSection,
  EffortWeeklyTssSection,
} from '@/components/effort/effort-charts-section';
import { EffortDimensionsSection } from '@/components/effort/effort-dimensions-section';
import { EffortHero } from '@/components/effort/effort-hero';
import { EffortStatsStrip } from '@/components/effort/effort-stats-strip';
import { EffortVerdictSection } from '@/components/effort/effort-verdict-section';
import { EffortWhyBlock } from '@/components/effort/effort-why-block';
import type { GlobalDecisionContext } from '@/core/presentation/global-decision-context';
import {
  DataReliabilityFooter,
  MetricDrillDownPage,
  type MetricTone,
} from '@/components/today/drill-down/metric-drill-down-page';
import type { FatigueType, TrainingCapacity } from '@/lib/today-mapping';
import type { DimensionResult } from '@/hooks/use-today';

export type EffortPageViewProps = {
  date: Date;
  isToday?: boolean;
  maxDate?: Date;
  onDateChange?: (date: Date) => void;
  onPreviousDay?: () => void;
  onNextDay?: () => void;
  loading?: boolean;
  strainScore: number | null;
  dailyLoad: number;
  weeklyLoad: number;
  fatigueType: FatigueType | string;
  fatigueTypeLabel: string | null;
  performancePercent: number | null;
  consecutiveDays: number;
  estimatedDaysToFresh: number | null;
  strainSubtitle: string;
  strainStatusLabel: string;
  strainStatusClassName: string;
  strainStrokeColor: string;
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
  completenessLabel: string;
  availableDimCount: number;
  globalDecision: GlobalDecisionContext;
};

export function EffortPageView(props: EffortPageViewProps) {
  const {
    date,
    isToday,
    maxDate,
    onDateChange,
    onPreviousDay,
    onNextDay,
    loading = false,
    strainScore,
    dailyLoad,
    weeklyLoad,
    fatigueType,
    fatigueTypeLabel,
    performancePercent,
    consecutiveDays,
    estimatedDaysToFresh,
    strainSubtitle,
    strainStatusLabel,
    strainStatusClassName,
    acwr,
    chronicWeeklyAvg,
    tsb,
    confidencePct,
    completenessLabel,
    verdict,
    verdictClass,
    verdictKey,
    trainingCapacity,
    dimensions,
    missingDimCount,
    dominantDimension,
    isLowFatigue,
    pmcSeries,
    weeklyTss,
    avgWeeklyTss,
    overreaching,
    availableDimCount,
    globalDecision,
  } = props;

  return (
    <MetricDrillDownPage
      footer={
        <DataReliabilityFooter
          completenessLabel={completenessLabel}
          confidencePct={confidencePct}
          dimensionCount={availableDimCount}
          dimensionTotal={5}
          loading={loading}
        />
      }
    >
      <EffortHero
        confidencePct={confidencePct}
        consecutiveDays={consecutiveDays}
        dailyLoad={dailyLoad}
        date={date}
        estimatedDaysToFresh={estimatedDaysToFresh}
        fatigueType={fatigueType}
        fatigueTypeLabel={fatigueTypeLabel}
        isToday={isToday}
        loading={loading}
        maxDate={maxDate}
        performancePercent={performancePercent}
        strainScore={strainScore}
        strainStatusClassName={strainStatusClassName}
        strainStatusLabel={strainStatusLabel}
        strainSubtitle={strainSubtitle}
        onDateChange={onDateChange}
        onNextDay={onNextDay}
        onPreviousDay={onPreviousDay}
      />

      <EffortStatsStrip acwr={acwr} loading={loading} tsb={tsb} weeklyTss={weeklyLoad} />

      <EffortWhyBlock
        acwr={acwr}
        globalDecision={globalDecision}
        loading={loading}
        tsb={tsb}
        verdict={verdict}
        verdictClass={verdictClass}
      />

      {!loading ? (
        <EffortVerdictSection
          acwr={acwr}
          chronicWeeklyAvg={chronicWeeklyAvg}
          dominantDimension={dominantDimension}
          isLowFatigue={isLowFatigue}
          trainingCapacity={trainingCapacity}
          tsb={tsb}
          verdict={verdict}
          verdictClass={verdictClass}
          verdictKey={verdictKey}
          weeklyLoad={weeklyLoad}
        />
      ) : null}

      <EffortDimensionsSection
        dimensions={dimensions}
        loading={loading}
        missingCount={missingDimCount}
      />

      {!loading ? (
        <>
          <EffortPmcSection data={pmcSeries} />
          <EffortWeeklyTssSection avgWeeklyTss={avgWeeklyTss} data={weeklyTss} />
          <EffortAlertsSection overreaching={overreaching} />
        </>
      ) : null}
    </MetricDrillDownPage>
  );
}

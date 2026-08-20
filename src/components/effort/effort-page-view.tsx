'use client';

import { EffortAlertsSection } from '@/components/effort/blocks/effort-alerts-section';
import { EffortDimensionsSection } from '@/components/effort/blocks/effort-dimensions-section';
import { EffortHero } from '@/components/effort/blocks/effort-hero';
import { EffortStatsStrip } from '@/components/effort/blocks/effort-stats-strip';
import { EffortStrainCompositionSection } from '@/components/effort/blocks/effort-strain-composition-section';
import { EffortVerdictSection } from '@/components/effort/blocks/effort-verdict-section';
import { EffortWhyBlock } from '@/components/effort/blocks/effort-why-block';
import {
  DataReliabilityFooter,
  MetricDrillDownPage,
  type MetricTone,
} from '@/components/today/drill-down/metric-drill-down-page';
import { Skeleton } from '@/components/ui/skeleton';
import type { EffortStrainCompositionView } from '@/lib/presentation/effort-strain-composition';
import type { FatigueType, TrainingCapacity } from '@/lib/today/today-mapping';
import type { DimensionResult } from '@/hooks/use-today';
import dynamic from 'next/dynamic';

const EffortPmcSection = dynamic(
  () =>
    import('@/components/effort/blocks/effort-charts-section').then((mod) => mod.EffortPmcSection),
  { ssr: false, loading: () => <Skeleton className="h-[140px] w-full" /> },
);
const EffortWeeklyTssSection = dynamic(
  () =>
    import('@/components/effort/blocks/effort-charts-section').then(
      (mod) => mod.EffortWeeklyTssSection,
    ),
  { ssr: false, loading: () => <Skeleton className="h-[140px] w-full" /> },
);

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
  strainComposition: EffortStrainCompositionView;
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
    dailyLoad,
    weeklyLoad,
    strainComposition,
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
        chronicWeeklyAvg={chronicWeeklyAvg}
        loading={loading}
        trainingCapacity={trainingCapacity}
        tsb={tsb}
        verdictKey={verdictKey}
        weeklyLoad={weeklyLoad}
      />

      {!loading ? (
        <EffortVerdictSection
          acwr={acwr}
          chronicWeeklyAvg={chronicWeeklyAvg}
          dominantDimension={dominantDimension}
          isLowFatigue={isLowFatigue}
          trainingCapacity={trainingCapacity}
          tsb={tsb}
          verdictKey={verdictKey}
          weeklyLoad={weeklyLoad}
        />
      ) : null}

      {!loading ? <EffortPmcSection data={pmcSeries} /> : null}

      {!loading ? (
        <details className="group">
          <summary className="text-muted-foreground hover:text-foreground cursor-pointer list-none py-2 text-xs font-medium tracking-wide transition-colors [&::-webkit-details-marker]:hidden">
            <span className="underline-offset-2 group-open:no-underline">
              Détail · composition, dimensions, historique
            </span>
          </summary>
          <div className="mt-3 space-y-4">
            <EffortStrainCompositionSection composition={strainComposition} />
            <EffortDimensionsSection dimensions={dimensions} missingCount={missingDimCount} />
            <EffortWeeklyTssSection avgWeeklyTss={avgWeeklyTss} data={weeklyTss} />
            <EffortAlertsSection overreaching={overreaching} />
            <section className="px-0.5">
              <p className="text-label mb-2">Glossaire</p>
              <ul className="text-muted-foreground space-y-1.5 text-xs leading-relaxed">
                <li>
                  <span className="text-foreground font-medium">TSS</span> — charge d’une séance
                  (Training Stress Score)
                </li>
                <li>
                  <span className="text-foreground font-medium">ACWR</span> — ratio charge 7 j /
                  base chronique (montée)
                </li>
                <li>
                  <span className="text-foreground font-medium">TSB</span> — forme nette (forme
                  chronique − fatigue aiguë)
                </li>
                <li>
                  <span className="text-foreground font-medium">CTL / ATL</span> — forme chronique /
                  fatigue aiguë
                </li>
              </ul>
            </section>
          </div>
        </details>
      ) : null}
    </MetricDrillDownPage>
  );
}

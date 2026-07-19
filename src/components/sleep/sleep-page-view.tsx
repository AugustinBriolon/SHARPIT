'use client';

import { SleepCoachTonight } from '@/components/sleep/sleep-coach-tonight';
import { SleepHero } from '@/components/sleep/sleep-hero';
import { SleepPhasesSection } from '@/components/sleep/sleep-phases-section';
import { SleepStatsStrip } from '@/components/sleep/sleep-stats-strip';
import { SleepTrendSection } from '@/components/sleep/sleep-trend-chart';
import { SleepWhyBlock } from '@/components/sleep/sleep-why-block';
import type { SleepPageViewProps } from '@/components/sleep/types';
import { MetricDrillDownPage } from '@/components/today/drill-down/metric-drill-down-page';
import { formatClock, formatDuration } from '@/lib/sleep';

export type { SleepPageViewProps } from '@/components/sleep/types';

function pickCoachingLine(props: SleepPageViewProps): string | null {
  const [insight] = props.coachView.insights;
  if (insight?.detail) return insight.detail;
  if (insight?.title) return insight.title;
  return null;
}

function sleepActionLine(props: SleepPageViewProps): string | null {
  const bedtime = props.coachView.recommendedBedtimeMin;
  if (bedtime != null) {
    return `Ce soir · coucher conseillé ${formatClock(bedtime)}`;
  }
  const debt = props.coachView.debt7Min;
  if (debt != null && debt > 30) {
    return `Dette 7 jours ${formatDuration(debt)} — rattraper progressivement`;
  }
  if (props.targetDeltaMin != null && props.targetDeltaMin < 0) {
    return `Objectif · récupérer ${formatDuration(Math.abs(props.targetDeltaMin))}`;
  }
  return null;
}

export function SleepPageView(props: SleepPageViewProps) {
  const {
    date,
    isToday,
    maxDate,
    onDateChange,
    onPreviousDay,
    onNextDay,
    sleepScore,
    adequacyDisplay,
    scoreBreakdown,
    totalSleepMin,
    deepMin,
    remMin,
    lightMin,
    awakeMin,
    bedtimeMin,
    wakeMin,
    sleepDelta7d,
    targetDeltaMin,
    sleepTargetMin,
    coachView,
    barData,
    recoveryNote,
    globalDecision,
    confidencePresentation,
  } = props;

  return (
    <MetricDrillDownPage
      footer={
        recoveryNote ? (
          <p className="text-muted-foreground text-center text-xs leading-relaxed">
            {recoveryNote}
          </p>
        ) : undefined
      }
    >
      <SleepHero
        actionLine={sleepActionLine(props)}
        adequacyDisplay={adequacyDisplay}
        bedtimeMin={bedtimeMin}
        confidencePct={confidencePresentation.pct}
        date={date}
        isToday={isToday}
        maxDate={maxDate}
        sleepScore={sleepScore}
        totalSleepMin={totalSleepMin}
        wakeMin={wakeMin}
        onDateChange={onDateChange}
        onNextDay={onNextDay}
        onPreviousDay={onPreviousDay}
      />

      <SleepStatsStrip
        restorativeRatio={scoreBreakdown.restorativeRatio}
        sleepDelta7d={sleepDelta7d}
        sleepTargetMin={sleepTargetMin}
        targetDeltaMin={targetDeltaMin}
        totalSleepMin={totalSleepMin}
      />

      <SleepWhyBlock
        debt7Min={coachView.debt7Min}
        globalDecision={globalDecision}
        restorativeRatio={scoreBreakdown.restorativeRatio}
        targetDeltaMin={targetDeltaMin}
      />

      <SleepCoachTonight coachingLine={pickCoachingLine(props)} view={coachView} />

      {totalSleepMin != null && totalSleepMin > 0 ? (
        <SleepPhasesSection
          awakeMin={awakeMin}
          deepMin={deepMin}
          lightMin={lightMin}
          remMin={remMin}
          totalMin={totalSleepMin}
        />
      ) : null}

      <SleepTrendSection data={barData} targetMin={sleepTargetMin} />
    </MetricDrillDownPage>
  );
}

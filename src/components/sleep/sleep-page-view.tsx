'use client';

import { SleepCoachTonight } from '@/components/sleep/sleep-coach-tonight';
import { SleepHero } from '@/components/sleep/sleep-hero';
import { SleepPhasesSection } from '@/components/sleep/sleep-phases-section';
import { SleepStatsStrip } from '@/components/sleep/sleep-stats-strip';
import { SleepTrendSection } from '@/components/sleep/sleep-trend-chart';
import { MetricDrillDownPage } from '@/components/today/drill-down/metric-drill-down-page';
import { GlobalDecisionStrip } from '@/components/today/drill-down/global-decision-strip';
import type { SleepPageViewProps } from '@/components/sleep/types';

export type { SleepPageViewProps } from '@/components/sleep/types';

function pickCoachingLine(props: SleepPageViewProps): string | null {
  const [insight] = props.coachView.insights;
  if (insight?.detail) return insight.detail;
  if (insight?.title) return insight.title;
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
        adequacyDisplay={adequacyDisplay}
        bedtimeMin={bedtimeMin}
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

      <GlobalDecisionStrip context={globalDecision} />

      <SleepStatsStrip
        restorativeRatio={scoreBreakdown.restorativeRatio}
        sleepDelta7d={sleepDelta7d}
        sleepTargetMin={sleepTargetMin}
        targetDeltaMin={targetDeltaMin}
        totalSleepMin={totalSleepMin}
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

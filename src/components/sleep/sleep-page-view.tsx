'use client';

import { SleepCoachTonight } from '@/components/sleep/sleep-coach-tonight';
import { SleepHero } from '@/components/sleep/sleep-hero';
import { SleepPhasesSection } from '@/components/sleep/sleep-phases-section';
import { SleepScoreExplainer } from '@/components/sleep/sleep-score-explainer';
import { SleepStatsStrip } from '@/components/sleep/sleep-stats-strip';
import { SleepTrendSection } from '@/components/sleep/sleep-trend-chart';
import { InsightNarrative } from '@/components/product-insight/insight-narrative';
import { MetricDrillDownPage } from '@/components/today/drill-down/metric-drill-down-page';
import { sleepInsightNarrativeSections } from '@/components/product-insight/narrative-sections';
import type { SleepPageViewProps } from '@/components/sleep/types';

export type { SleepPageViewProps } from '@/components/sleep/types';

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
    garminScore,
    sleepDelta7d,
    targetDeltaMin,
    sleepTargetMin,
    coachView,
    barData,
    recoveryNote,
    insights,
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
        garminScore={garminScore}
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

      <InsightNarrative sections={sleepInsightNarrativeSections(insights)} />

      <SleepCoachTonight view={coachView} />

      <SleepTrendSection data={barData} targetMin={sleepTargetMin} />

      {totalSleepMin != null && totalSleepMin > 0 ? (
        <SleepPhasesSection
          awakeMin={awakeMin}
          deepMin={deepMin}
          lightMin={lightMin}
          remMin={remMin}
          totalMin={totalSleepMin}
        />
      ) : null}

      <SleepScoreExplainer garminScore={garminScore} scoreBreakdown={scoreBreakdown} />
    </MetricDrillDownPage>
  );
}

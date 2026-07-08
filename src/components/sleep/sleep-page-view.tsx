'use client';

import { SleepCoachTonight } from '@/components/sleep/sleep-coach-tonight';
import { SleepHero } from '@/components/sleep/sleep-hero';
import { SleepInsightCards } from '@/components/sleep/sleep-insight-cards';
import { SleepPhasesSection } from '@/components/sleep/sleep-phases-section';
import { SleepScoreExplainer } from '@/components/sleep/sleep-score-explainer';
import { SleepStatsStrip } from '@/components/sleep/sleep-stats-strip';
import { SleepTrendSection } from '@/components/sleep/sleep-trend-chart';
import { InsightList } from '@/components/product-insight/insight-list';
import { MetricDrillDownPage } from '@/components/today/drill-down/metric-drill-down-page';
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

      <InsightList insights={insights.primary} label="Ce que cette nuit change" />

      <SleepCoachTonight view={coachView} />

      <InsightList insights={insights.supporting} label="Action et architecture de la nuit" />

      <SleepInsightCards insights={coachView.insights} />

      <SleepTrendSection data={barData} targetMin={sleepTargetMin} />

      {totalSleepMin != null && totalSleepMin > 0 && (
        <SleepPhasesSection
          awakeMin={awakeMin}
          deepMin={deepMin}
          lightMin={lightMin}
          remMin={remMin}
          totalMin={totalSleepMin}
        />
      )}

      <InsightList insights={insights.contextual} label="Contexte utile" />

      <SleepScoreExplainer garminScore={garminScore} scoreBreakdown={scoreBreakdown} />
    </MetricDrillDownPage>
  );
}

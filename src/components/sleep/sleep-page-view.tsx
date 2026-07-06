'use client';

import { SleepCoachTonight } from '@/components/sleep/sleep-coach-tonight';
import { SleepHero } from '@/components/sleep/sleep-hero';
import { SleepInsightCards } from '@/components/sleep/sleep-insight-cards';
import { SleepPhasesSection } from '@/components/sleep/sleep-phases-section';
import { SleepScoreExplainer } from '@/components/sleep/sleep-score-explainer';
import { SleepStatsStrip } from '@/components/sleep/sleep-stats-strip';
import { SleepTrendSection } from '@/components/sleep/sleep-trend-chart';
import { MetricDrillDownPage } from '@/components/today/drill-down/metric-drill-down-page';
import type { SleepPageViewProps } from '@/components/sleep/types';

export type { SleepPageViewProps } from '@/components/sleep/types';

export function SleepPageView(props: SleepPageViewProps) {
  const {
    date,
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
        sleepScore={sleepScore}
        totalSleepMin={totalSleepMin}
        wakeMin={wakeMin}
      />

      <SleepStatsStrip
        restorativeRatio={scoreBreakdown.restorativeRatio}
        sleepDelta7d={sleepDelta7d}
        sleepTargetMin={sleepTargetMin}
        targetDeltaMin={targetDeltaMin}
        totalSleepMin={totalSleepMin}
      />

      {totalSleepMin != null && totalSleepMin > 0 && (
        <SleepPhasesSection
          awakeMin={awakeMin}
          deepMin={deepMin}
          lightMin={lightMin}
          remMin={remMin}
          totalMin={totalSleepMin}
        />
      )}

      <SleepCoachTonight view={coachView} />

      <SleepTrendSection data={barData} targetMin={sleepTargetMin} />

      <SleepInsightCards insights={coachView.insights} />

      <SleepScoreExplainer garminScore={garminScore} scoreBreakdown={scoreBreakdown} />
    </MetricDrillDownPage>
  );
}

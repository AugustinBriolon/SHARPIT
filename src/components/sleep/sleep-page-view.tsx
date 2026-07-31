'use client';

import { SleepCoachTonight } from '@/components/sleep/sleep-coach-tonight';
import { SleepHero } from '@/components/sleep/sleep-hero';
import { SleepPhasesSection } from '@/components/sleep/sleep-phases-section';
import { SleepStatsStrip } from '@/components/sleep/sleep-stats-strip';
import { SleepWhyBlock } from '@/components/sleep/sleep-why-block';
import type { SleepPageViewProps } from '@/components/sleep/types';
import { MetricDrillDownPage } from '@/components/today/drill-down/metric-drill-down-page';
import { Skeleton } from '@/components/ui/skeleton';
import { formatClock, formatDuration } from '@/lib/sleep/sleep';
import dynamic from 'next/dynamic';

const SleepTrendSection = dynamic(
  () => import('@/components/sleep/sleep-trend-chart').then((mod) => mod.SleepTrendSection),
  { ssr: false, loading: () => <Skeleton className="h-[160px] w-full" /> },
);

export type { SleepPageViewProps } from '@/components/sleep/types';

function pickCoachingLine(props: SleepPageViewProps): string | null {
  // Debt / architecture lines assume tonight's night is known.
  if ((props.nightStatus ?? 'present') !== 'present') return null;
  const [insight] = props.coachView.insights;
  if (insight?.detail) return insight.detail;
  if (insight?.title) return insight.title;
  return null;
}

function sleepActionLine(props: SleepPageViewProps): string | null {
  const nightStatus = props.nightStatus ?? 'present';
  const bedtime = props.coachView.recommendedBedtimeMin;

  // Forward plan is OK even before tonight syncs; debt-as-tonight verdict is not.
  if (bedtime != null) {
    return `Ce soir · coucher conseillé ${formatClock(bedtime)}`;
  }

  if (nightStatus !== 'present') return null;

  const debt = props.coachView.debt7Min;
  if (debt != null && debt > 30) {
    return `Dette 7 jours ${formatDuration(debt)} — rattraper progressivement`;
  }
  if (props.targetDeltaMin != null && props.targetDeltaMin < 0) {
    return `Objectif · récupérer ${formatDuration(Math.abs(props.targetDeltaMin))}`;
  }
  return null;
}

function pickHeroInsight(props: SleepPageViewProps): string | null {
  return pickCoachingLine(props) ?? sleepActionLine(props);
}

export function SleepPageView(props: SleepPageViewProps) {
  const {
    date,
    isToday,
    maxDate,
    onDateChange,
    onPreviousDay,
    onNextDay,
    loading = false,
    nightStatus = 'present',
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
    coachView,
    barData,
    recoveryNote,
    confidencePresentation,
  } = props;

  let footer: React.ReactNode;
  if (loading) {
    footer = <Skeleton className="mx-auto h-3 w-48 rounded-full" />;
  } else if (recoveryNote) {
    footer = (
      <p className="text-muted-foreground text-center text-xs leading-relaxed">{recoveryNote}</p>
    );
  } else {
    footer = undefined;
  }

  const whyPanel = (
    <SleepWhyBlock
      debt7Min={coachView.debt7Min}
      loading={loading}
      nightStatus={nightStatus}
      restorativeRatio={scoreBreakdown.restorativeRatio}
      targetDeltaMin={props.targetDeltaMin}
      asPanel
    />
  );

  return (
    <MetricDrillDownPage footer={footer}>
      <SleepHero
        adequacyDisplay={adequacyDisplay}
        bedtimeMin={bedtimeMin}
        confidencePct={confidencePresentation.pct}
        date={date}
        insightLine={loading ? null : pickHeroInsight(props)}
        isToday={isToday}
        loading={loading}
        maxDate={maxDate}
        sleepScore={sleepScore}
        wakeMin={wakeMin}
        onDateChange={onDateChange}
        onNextDay={onNextDay}
        onPreviousDay={onPreviousDay}
      />

      <SleepStatsStrip
        awakeMin={awakeMin}
        bedtimeMin={bedtimeMin}
        deepMin={deepMin}
        loading={loading}
        restorativeRatio={scoreBreakdown.restorativeRatio}
        totalSleepMin={totalSleepMin}
        wakeMin={wakeMin}
      />

      {!loading ? (
        <>
          {totalSleepMin != null && totalSleepMin > 0 ? (
            <SleepPhasesSection
              awakeMin={awakeMin}
              deepMin={deepMin}
              lightMin={lightMin}
              remMin={remMin}
              totalMin={totalSleepMin}
              whyPanel={whyPanel}
            />
          ) : (
            whyPanel
          )}

          <SleepCoachTonight coachingLine={null} view={coachView} />

          <SleepTrendSection data={barData} targetMin={props.sleepTargetMin} />
        </>
      ) : null}
    </MetricDrillDownPage>
  );
}

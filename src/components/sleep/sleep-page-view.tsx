'use client';

import { SleepCoachTonight } from '@/components/sleep/blocks/sleep-coach-tonight';
import { SleepHero } from '@/components/sleep/blocks/sleep-hero';
import { SleepPhasesSection } from '@/components/sleep/blocks/sleep-phases-section';
import { SleepStatsStrip } from '@/components/sleep/blocks/sleep-stats-strip';
import type { SleepPageViewProps } from '@/components/sleep/types';
import { MetricDrillDownPage } from '@/components/today/drill-down/metric-drill-down-page';
import { Skeleton } from '@/components/ui/skeleton';
import { formatClock, formatDuration } from '@/lib/sleep/sleep';
import dynamic from 'next/dynamic';

const SleepTrendSection = dynamic(
  () => import('@/components/sleep/blocks/sleep-trend-chart').then((mod) => mod.SleepTrendSection),
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

/**
 * The plate states, the card explains.
 *
 * The coaching paragraph led here and repeated, verbatim, what the "Ce soir" card
 * now says two sections down — the debt, the target, the catch-up. The short
 * action goes first; the paragraph only stands in when there is no bedtime to
 * name and the card would have nothing to hold.
 */
function pickHeroInsight(props: SleepPageViewProps): string | null {
  return sleepActionLine(props) ?? pickCoachingLine(props);
}

export function SleepPageView(props: SleepPageViewProps) {
  const {
    date,
    isToday,
    maxDate,
    minDate,
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

  /* The plan now occupies the slot the "Pourquoi" narrative used to hold, beside
     the night structure — what to do tonight, next to how last night went. */
  const tonightPanel = (
    <SleepCoachTonight
      nightStatus={nightStatus}
      restorativeRatio={scoreBreakdown.restorativeRatio}
      targetDeltaMin={props.targetDeltaMin}
      view={coachView}
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
        minDate={minDate}
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
              sidePanel={tonightPanel}
              totalMin={totalSleepMin}
            />
          ) : (
            tonightPanel
          )}

          <SleepTrendSection data={barData} targetMin={props.sleepTargetMin} />
        </>
      ) : null}
    </MetricDrillDownPage>
  );
}

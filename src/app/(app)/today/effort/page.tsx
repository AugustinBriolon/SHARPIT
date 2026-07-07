'use client';

import { MobileDrillDownHeader } from '@/components/layout/mobile-drill-down-header';
import { EffortPageView } from '@/components/effort/effort-page-view';
import { useActivities } from '@/hooks/use-data';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import { useToday } from '@/hooks/use-today';
import { computePmcSeries } from '@/lib/analytics';
import { resolve } from '@/lib/french';
import { computeTrainingLoad, enrichFatigueLoadDimension } from '@/lib/training-load';
import { mapConfidenceToTier, type FatigueType, type TrainingCapacity } from '@/lib/today-mapping';
import type { MetricTone } from '@/components/today/drill-down/metric-cell';

const OVERREACHING_RISK_DISPLAY: Record<string, { label: string; colorClass: string } | undefined> =
  {
    MODERATE: { label: 'Risque modéré', colorClass: 'text-amber-600' },
    HIGH: { label: 'Risque élevé', colorClass: 'text-orange-600' },
    CRITICAL: { label: 'Risque critique', colorClass: 'text-red-600' },
  };

const FATIGUE_VERDICT_DISPLAY: Record<string, { label: string; colorClass: string }> = {
  BUILD: { label: 'Progresser', colorClass: 'text-emerald-600' },
  MAINTAIN: { label: 'Maintenir', colorClass: 'text-blue-600' },
  REDUCE: { label: 'Réduire la charge', colorClass: 'text-amber-600' },
  REST_WEEK: { label: 'Semaine de récupération', colorClass: 'text-orange-600' },
  TAPER: { label: 'Affûtage', colorClass: 'text-blue-600' },
  INSUFFICIENT_DATA: { label: 'Données insuffisantes', colorClass: 'text-muted-foreground' },
};

const COMPLETENESS_LABEL: Record<string, string> = {
  FULL: 'Complètes',
  PARTIAL: 'Partielles',
  SPARSE: 'Éparses',
  INSUFFICIENT: 'Insuffisantes',
};

const CONFIDENCE_TONE: Record<string, MetricTone> = {
  high: 'good',
  medium: 'warn',
  low: 'neutral',
};

export default function TodayEffortPage() {
  const { date, isToday, maxDate, setDate, goToNextDay, goToPreviousDay } = useTodaySelectedDate();
  const { data, loading } = useToday(date);
  const { fatigue, dailyStrain } = data;
  const { data: activities = [] } = useActivities();

  if (loading) {
    return (
      <div>
        <MobileDrillDownHeader title="Charge d'effort" />
        <div className="animate-pulse space-y-4 p-4">
          <div className="bg-muted mx-auto h-48 rounded-3xl" />
          <div className="bg-muted mx-auto h-16 rounded-3xl" />
          <div className="bg-muted mx-auto h-40 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!fatigue) {
    return (
      <div className="space-y-4">
        <MobileDrillDownHeader title="Charge d'effort" />
        <p className="text-muted-foreground text-sm">Données de fatigue indisponibles.</p>
      </div>
    );
  }

  const activityInputs = activities.map((a) => ({ load: a.load, date: new Date(a.date) }));
  const trainingLoad = computeTrainingLoad(activityInputs, date);
  const dailyLoad = dailyStrain?.dailyTss ?? trainingLoad.dailyLoad;

  const pmcSeries = computePmcSeries(
    activities.map((a) => ({ ...a, date: new Date(a.date) })),
    28,
    date,
  );

  const weeklyTss: { week: string; tss: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - w * 7 - 6);
    const weekEnd = new Date(date);
    weekEnd.setDate(date.getDate() - w * 7);
    const total = activities
      .filter((a) => {
        const d = new Date(a.date);
        return d >= weekStart && d <= weekEnd;
      })
      .reduce((s, a) => s + (a.load ?? 0), 0);
    weeklyTss.push({ week: w === 0 ? 'Cette sem.' : `S-${w}`, tss: Math.round(total) });
  }
  const avgWeeklyTss =
    weeklyTss.length > 0
      ? Math.round(weeklyTss.reduce((s, w) => s + w.tss, 0) / weeklyTss.length)
      : 0;

  const chronicWeeklyAvg =
    trainingLoad.acwr > 0 ? Math.round(trainingLoad.weeklyLoad / trainingLoad.acwr) : null;

  const lastTsb = pmcSeries.length > 0 ? (pmcSeries[pmcSeries.length - 1]?.tsb ?? null) : null;

  const performancePercent =
    fatigue.performanceImpairmentEstimate > 0
      ? Math.round((1 - fatigue.performanceImpairmentEstimate) * 100)
      : null;

  const verdictDisplay =
    FATIGUE_VERDICT_DISPLAY[fatigue.decision.verdict] ?? FATIGUE_VERDICT_DISPLAY.INSUFFICIENT_DATA;

  const confidencePct = Math.round(fatigue.confidence * 100);
  const confidenceTier = mapConfidenceToTier(fatigue.confidence);
  const completenessLabel =
    COMPLETENESS_LABEL[fatigue.dataCompleteness] ?? fatigue.dataCompleteness;

  const isLowFatigue =
    fatigue.fatigueLevel === 'FRESH' || fatigue.fatigueLevel === 'FUNCTIONAL_LOW';

  const dimensions = enrichFatigueLoadDimension(fatigue.dimensions, trainingLoad.acwr);
  const availableDimCount = Object.values(dimensions).filter((d) => d.available).length;

  return (
    <div className="space-y-4">
      <MobileDrillDownHeader title="Charge d'effort" />
      <EffortPageView
        acwr={trainingLoad.acwr}
        availableDimCount={availableDimCount}
        avgWeeklyTss={avgWeeklyTss}
        chronicWeeklyAvg={chronicWeeklyAvg}
        completenessLabel={completenessLabel}
        confidencePct={confidencePct}
        confidenceTone={CONFIDENCE_TONE[confidenceTier] ?? 'neutral'}
        consecutiveDays={fatigue.consecutiveAccumulationDays}
        dailyLoad={dailyLoad}
        date={date}
        dimensions={dimensions}
        dominantDimension={fatigue.dominantDimension}
        estimatedDaysToFresh={fatigue.estimatedTimeToFresh}
        fatigueType={fatigue.fatigueType as FatigueType}
        isLowFatigue={isLowFatigue}
        isToday={isToday}
        keyEvidence={fatigue.recommendation.keyEvidence.map((e) => resolve(e))}
        maxDate={maxDate}
        missingDimCount={5 - availableDimCount}
        overreaching={OVERREACHING_RISK_DISPLAY[fatigue.signals.functionalOverreachingRisk]}
        performancePercent={performancePercent}
        pmcSeries={pmcSeries}
        primaryLimitingFactor={fatigue.primaryLimitingFactor}
        rationale={fatigue.decision.rationale.map((r) => resolve(r))}
        trainingCapacity={fatigue.trainingCapacity as TrainingCapacity}
        tsb={lastTsb}
        verdict={verdictDisplay.label}
        verdictClass={verdictDisplay.colorClass}
        verdictKey={fatigue.decision.verdict}
        weeklyLoad={trainingLoad.weeklyLoad}
        weeklyTss={weeklyTss}
        onDateChange={setDate}
        onNextDay={goToNextDay}
        onPreviousDay={goToPreviousDay}
      />
    </div>
  );
}

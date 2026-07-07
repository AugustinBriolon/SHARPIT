'use client';

import { MobileDrillDownHeader } from '@/components/layout/mobile-drill-down-header';
import { AdaptationPageView } from '@/components/adaptation/adaptation-page-view';
import { useTodaySelectedDate } from '@/hooks/use-today-selected-date';
import { useToday } from '@/hooks/use-today';
import { resolve } from '@/lib/french';
import { mapConfidenceToTier } from '@/lib/today-mapping';
import { ADAPTATION_STATUS_SIGNAL } from '@/lib/today-dashboard-labels';
import type { AdaptationData } from '@/hooks/use-today';
import type { MetricTone } from '@/components/today/drill-down/metric-cell';

const ADAPTATION_VERDICT_DISPLAY: Record<string, { label: string; colorClass: string }> = {
  INCREASE_LOAD: { label: 'Augmenter la charge', colorClass: 'text-emerald-600' },
  SUSTAIN: { label: 'Maintenir la trajectoire', colorClass: 'text-blue-600' },
  CONSOLIDATE: { label: 'Consolider', colorClass: 'text-blue-600' },
  REDUCE_LOAD: { label: 'Réduire la charge', colorClass: 'text-amber-600' },
  RECOVERY_PRIORITY: { label: 'Priorité récupération', colorClass: 'text-orange-600' },
  INSUFFICIENT_DATA: { label: 'Historique insuffisant', colorClass: 'text-muted-foreground' },
};

const TREND_LABEL: Record<string, string> = {
  IMPROVING: 'En progression',
  STABLE: 'Stable',
  DECLINING: 'En baisse',
};

const CONFIDENCE_TONE: Record<string, MetricTone> = {
  high: 'good',
  medium: 'warn',
  low: 'neutral',
};

const DIMENSION_COPY: Record<
  keyof AdaptationData['dimensions'],
  { label: string; description: string }
> = {
  loadProgression: {
    label: 'Progression de charge',
    description: 'La charge d’entraînement évolue-t-elle de façon productive ?',
  },
  neuromuscularEfficiency: {
    label: 'Efficacité neuromusculaire',
    description: 'Même effort, meilleure performance ?',
  },
  autonomicAdaptation: {
    label: 'Adaptation autonome',
    description: 'Le système nerveux suit-il la charge ?',
  },
  recoveryQuality: {
    label: 'Qualité de récupération',
    description: 'La récupération soutient-elle l’adaptation ?',
  },
};

export default function TodayAdaptationPage() {
  const { date, isToday, maxDate, setDate, goToNextDay, goToPreviousDay } = useTodaySelectedDate();
  const { data, loading } = useToday(date);
  const { adaptation } = data;

  if (loading) {
    return (
      <div>
        <MobileDrillDownHeader title="Adaptation" />
        <div className="animate-pulse space-y-4 p-4">
          <div className="bg-muted mx-auto h-48 rounded-3xl" />
          <div className="bg-muted mx-auto h-32 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!adaptation || adaptation.adaptationStatus === 'INSUFFICIENT_DATA') {
    return (
      <div className="space-y-4">
        <MobileDrillDownHeader title="Adaptation" />
        <p className="text-muted-foreground text-sm leading-relaxed">
          SHARPIT construit encore ton historique d’adaptation. Quelques semaines de données
          d’entraînement et de récupération suffisent pour une première lecture fiable.
        </p>
      </div>
    );
  }

  const status = ADAPTATION_STATUS_SIGNAL[adaptation.adaptationStatus];
  const verdict =
    ADAPTATION_VERDICT_DISPLAY[adaptation.decision.verdict] ??
    ADAPTATION_VERDICT_DISPLAY.INSUFFICIENT_DATA;
  const confidencePct = Math.round(adaptation.confidence * 100);
  const confidenceTier = mapConfidenceToTier(adaptation.confidence);

  return (
    <div className="space-y-4">
      <MobileDrillDownHeader title="Adaptation" />
      <AdaptationPageView
        adaptationIndex={adaptation.adaptationIndex}
        availableDimCount={adaptation.signals.availableDimensionCount}
        confidencePct={confidencePct}
        confidenceTone={CONFIDENCE_TONE[confidenceTier] ?? 'neutral'}
        date={date}
        historyLength={adaptation.signals.historyLength}
        isToday={isToday}
        keyEvidence={adaptation.recommendation.keyEvidence.map((e) => resolve(e))}
        limitingFactor={adaptation.limitingFactor}
        loadMultiplier={adaptation.decision.loadMultiplier}
        maxDate={maxDate}
        overreachingWithoutAdaptation={adaptation.overreachingWithoutAdaptationDetected}
        plateauRisk={adaptation.plateauRisk}
        rationale={adaptation.decision.rationale.map((r) => resolve(r))}
        statusClassName={status?.colorClass ?? 'text-muted-foreground'}
        statusLabel={status?.label ?? adaptation.adaptationStatus}
        trendLabel={TREND_LABEL[adaptation.adaptationTrend] ?? adaptation.adaptationTrend}
        verdictClassName={verdict.colorClass}
        verdictLabel={verdict.label}
        dimensions={Object.entries(adaptation.dimensions).map(([key, dim]) => ({
          key,
          ...DIMENSION_COPY[key as keyof AdaptationData['dimensions']],
          dim,
        }))}
        onDateChange={setDate}
        onNextDay={goToNextDay}
        onPreviousDay={goToPreviousDay}
      />
    </div>
  );
}

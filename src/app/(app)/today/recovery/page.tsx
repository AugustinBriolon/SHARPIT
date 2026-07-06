'use client';

import { MobileDrillDownHeader } from '@/components/layout/mobile-drill-down-header';
import { RecoveryPageView } from '@/components/recovery/recovery-page-view';
import { useHealthEntries } from '@/hooks/use-data';
import { useToday } from '@/hooks/use-today';
import { resolve } from '@/lib/french';
import {
  mapAutonomicBalanceToDisplay,
  mapConfidenceToTier,
  mapLoadStressContextToDisplay,
  mapRecoveryIntensityLabel,
  mapRecoveryToSignal,
  mapScoreToColorClass,
  mapSubjectiveWellnessToDisplay,
  type AutonomicBalance,
  type LoadStressContext,
  type ReadinessCategory,
  type RecommendedIntensity,
  type SubjectiveWellness,
} from '@/lib/today-mapping';
import type { MetricTone } from '@/components/today/drill-down/metric-cell';
import { format, isSameDay, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const PRIMARY_LIMITER_LABEL: Record<string, string> = {
  autonomic: 'Système nerveux autonome',
  sleep: 'Qualité du sommeil',
  subjective: 'Bien-être subjectif',
  loadContext: 'Contexte de charge',
};

const COMPLETENESS_LABEL: Record<string, string> = {
  FULL: 'Complètes',
  PARTIAL: 'Partielles',
  SPARSE: 'Éparses',
  INSUFFICIENT: 'Insuffisantes',
};

const RISK_DISPLAY: Record<string, { label: string; colorClass: string } | undefined> = {
  MODERATE: { label: 'Risque modéré', colorClass: 'text-amber-600' },
  HIGH: { label: 'Risque élevé', colorClass: 'text-orange-600' },
  CRITICAL: { label: 'Risque critique', colorClass: 'text-red-600' },
};

const ILLNESS_RISK_DISPLAY: Record<string, { label: string; colorClass: string } | undefined> = {
  ELEVATED: { label: 'Risque modéré', colorClass: 'text-amber-600' },
  HIGH: { label: 'Risque élevé', colorClass: 'text-red-600' },
};

const CONFIDENCE_TONE: Record<string, MetricTone> = {
  high: 'good',
  medium: 'warn',
  low: 'neutral',
};

export default function TodayRecoveryPage() {
  const { data, loading } = useToday();
  const { recovery } = data;
  const { data: healthEntries = [] } = useHealthEntries(14);

  if (loading) {
    return (
      <div>
        <MobileDrillDownHeader title="Récupération" />
        <div className="animate-pulse space-y-4 p-4">
          <div className="bg-muted mx-auto h-48 rounded-3xl" />
          <div className="bg-muted mx-auto h-16 rounded-3xl" />
          <div className="bg-muted mx-auto h-40 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!recovery) {
    return (
      <div className="space-y-4">
        <MobileDrillDownHeader title="Récupération" />
        <p className="text-muted-foreground text-sm">Données de récupération indisponibles.</p>
      </div>
    );
  }

  const today = new Date();
  const todayEntry = healthEntries.find((e) => isSameDay(new Date(e.date), today)) ?? null;

  const days14 = Array.from({ length: 14 }, (_, i) => subDays(today, 13 - i));
  const sparkHrv = days14.map((d) => {
    const e = healthEntries.find((h) => isSameDay(new Date(h.date), d));
    return { date: format(d, 'dd MMM', { locale: fr }), value: e?.hrv ?? null };
  });
  const sparkRhr = days14.map((d) => {
    const e = healthEntries.find((h) => isSameDay(new Date(h.date), d));
    return { date: format(d, 'dd MMM', { locale: fr }), value: e?.restingHr ?? null };
  });
  const dualData = days14.map((d) => {
    const e = healthEntries.find((h) => isSameDay(new Date(h.date), d));
    return {
      date: format(d, 'dd MMM', { locale: fr }),
      a: e?.bodyBattery ?? null,
      b: e?.stress ?? null,
    };
  });

  const signal = mapRecoveryToSignal(recovery.readinessCategory as ReadinessCategory);
  const autonomicDisplay = mapAutonomicBalanceToDisplay(
    recovery.signals.autonomicBalance as AutonomicBalance,
  );
  const wellnessDisplay = mapSubjectiveWellnessToDisplay(
    recovery.signals.subjectiveWellness as SubjectiveWellness,
  );
  const loadDisplay = mapLoadStressContextToDisplay(
    recovery.signals.loadStressContext as LoadStressContext,
  );

  const limiterLabel = recovery.primaryLimitingFactor
    ? (PRIMARY_LIMITER_LABEL[recovery.primaryLimitingFactor] ?? recovery.primaryLimitingFactor)
    : null;

  const confidencePct = Math.round(recovery.confidence * 100);
  const confidenceTier = mapConfidenceToTier(recovery.confidence);
  const completenessLabel =
    COMPLETENESS_LABEL[recovery.dataCompleteness] ?? recovery.dataCompleteness;

  const chipClass = (colorClass: string) => colorClass.split(' ')[0] ?? colorClass;

  const intensityLabel = mapRecoveryIntensityLabel(
    recovery.decision.recommendedIntensity as RecommendedIntensity,
  );

  return (
    <div className="space-y-4">
      <MobileDrillDownHeader title="Récupération" />
      <RecoveryPageView
        autonomicClass={chipClass(autonomicDisplay.colorClass)}
        autonomicLabel={autonomicDisplay.label}
        availableDimCount={Object.values(recovery.dimensions).filter((d) => d.available).length}
        baselineHigh={todayEntry?.hrvBaselineHigh ?? null}
        baselineLow={todayEntry?.hrvBaselineLow ?? null}
        bodyBattery={todayEntry?.bodyBattery ?? null}
        completenessLabel={completenessLabel}
        confidencePct={confidencePct}
        confidenceTone={CONFIDENCE_TONE[confidenceTier] ?? 'neutral'}
        date={today}
        dimensions={recovery.dimensions}
        dissonanceDetected={recovery.signals.dissonanceDetected}
        dualData={dualData}
        estimatedRecoveryDays={recovery.estimatedTimeToFullRecovery}
        hrv={todayEntry?.hrv ?? null}
        illness={ILLNESS_RISK_DISPLAY[recovery.signals.illnessRisk]}
        intensityClassName={mapScoreToColorClass(recovery.readinessScore)}
        intensityLabel={intensityLabel}
        isCalibrating={recovery.readinessCategory === 'BASELINE_PENDING'}
        keyEvidence={recovery.recommendation.keyEvidence.map((e) => resolve(e))}
        limiterLabel={limiterLabel}
        loadClass={chipClass(loadDisplay.colorClass)}
        loadLabel={loadDisplay.label}
        overreaching={RISK_DISPLAY[recovery.signals.overreachingRisk]}
        rationale={recovery.decision.rationale.map((r) => resolve(r))}
        readinessScore={recovery.readinessScore}
        restingHr={todayEntry?.restingHr ?? null}
        signal={signal}
        sparkHrv={sparkHrv}
        sparkRhr={sparkRhr}
        wellnessClass={chipClass(wellnessDisplay.colorClass)}
        wellnessLabel={wellnessDisplay.label}
      />
    </div>
  );
}

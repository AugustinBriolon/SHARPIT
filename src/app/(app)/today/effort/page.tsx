'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToday } from '@/hooks/use-today';
import { useActivities } from '@/hooks/use-data';
import { computeTrainingLoad } from '@/lib/training-load';
import { resolve } from '@/lib/french';
import {
  mapFatigueToSignal,
  mapFatigueCapacityLabel,
  mapFatigueTypeToLabel,
  mapScoreToColorClass,
  mapConfidenceToTier,
  type FatigueLevel,
  type FatigueTrajectory,
  type TrainingCapacity,
  type FatigueType,
} from '@/lib/today-mapping';
import type { DimensionResult } from '@/hooks/use-today';

// ─────────────────────────────────────────────────────────────────────────────
// Effort detail page — /today/effort
// ─────────────────────────────────────────────────────────────────────────────

const DIMENSION_LABEL: Record<string, string> = {
  load: "Charge d'entraînement",
  neuromuscular: 'Neuromusculaire',
  metabolic: 'Métabolique',
  cumulative: 'Cumulative',
  psychological: 'Psychologique',
};

const DIMENSION_DESCRIPTION: Record<string, string> = {
  load: 'TSS récent, ACWR, tendance de charge',
  neuromuscular: 'Charge en force et vitesse, temps de récupération musculaire',
  metabolic: 'Volume à haute intensité, dette lactique estimée',
  cumulative: 'Accumulation sur plusieurs semaines',
  psychological: 'Stress perçu, motivation, charge mentale',
};

const DOMINANT_LABEL: Record<string, string> = {
  load: 'Charge excessive',
  neuromuscular: 'Fatigue neuromusculaire',
  metabolic: 'Fatigue métabolique',
  cumulative: 'Accumulation chronique',
  psychological: 'Fatigue psychologique',
};

const OVERREACHING_RISK_DISPLAY: Record<string, { label: string; colorClass: string } | undefined> =
  {
    MODERATE: { label: 'Risque modéré', colorClass: 'text-amber-600 dark:text-amber-400' },
    HIGH: { label: 'Risque élevé', colorClass: 'text-orange-600 dark:text-orange-400' },
    CRITICAL: { label: 'Risque critique', colorClass: 'text-red-600 dark:text-red-400' },
  };

const FATIGUE_VERDICT_DISPLAY: Record<
  string,
  { label: string; colorClass: string; description: string }
> = {
  BUILD: {
    label: 'Progresser',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    description: 'La charge peut être augmentée pour stimuler les adaptations.',
  },
  MAINTAIN: {
    label: 'Maintenir',
    colorClass: 'text-blue-600 dark:text-blue-400',
    description: 'La charge actuelle est adaptée — ne pas augmenter ni réduire.',
  },
  REDUCE: {
    label: 'Réduire la charge',
    colorClass: 'text-amber-600 dark:text-amber-400',
    description: 'La fatigue dépasse la capacité de récupération — lever le pied.',
  },
  REST_WEEK: {
    label: 'Semaine de récupération',
    colorClass: 'text-orange-600 dark:text-orange-400',
    description: 'La fatigue accumulée nécessite une semaine de décharge complète.',
  },
  TAPER: {
    label: 'Affûtage',
    colorClass: 'text-blue-600 dark:text-blue-400',
    description: 'Réduction progressive de la charge pour optimiser la forme en compétition.',
  },
  INSUFFICIENT_DATA: {
    label: 'Données insuffisantes',
    colorClass: 'text-muted-foreground',
    description: 'Pas assez de données pour formuler une directive de charge.',
  },
};

const CONFIDENCE_TIER_LABEL: Record<string, { label: string; colorClass: string }> = {
  high: { label: 'Élevée', colorClass: 'text-emerald-600 dark:text-emerald-400' },
  medium: { label: 'Modérée', colorClass: 'text-amber-600 dark:text-amber-400' },
  low: { label: 'Faible', colorClass: 'text-slate-400' },
};

const COMPLETENESS_LABEL: Record<string, string> = {
  FULL: 'Complètes',
  PARTIAL: 'Partielles',
  SPARSE: 'Éparses',
  INSUFFICIENT: 'Insuffisantes',
};

function acwrZoneDisplay(acwr: number): { label: string; colorClass: string; description: string } {
  if (acwr <= 0) return { label: '—', colorClass: 'text-muted-foreground', description: '' };
  if (acwr < 0.9)
    return {
      label: 'Sous-charge',
      colorClass: 'text-blue-600 dark:text-blue-400',
      description: 'Charge insuffisante — risque de désentraînement progressif.',
    };
  if (acwr <= 1.3)
    return {
      label: 'Zone optimale',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      description: 'Sweet spot de progression — risque de blessure minimal.',
    };
  if (acwr <= 1.5)
    return {
      label: "Zone d'alerte",
      colorClass: 'text-amber-600 dark:text-amber-400',
      description: 'Charge aiguë élevée par rapport à la base — surveiller la récupération.',
    };
  return {
    label: 'Zone de risque',
    colorClass: 'text-red-600 dark:text-red-400',
    description: 'Surcharge acute marquée — risque blessure × 2-4 selon littérature.',
  };
}

function DimensionBar({ name, dim }: { name: string; dim: DimensionResult }) {
  if (!dim.available) return null;
  const { score } = dim;
  const colorClass = mapScoreToColorClass(score !== null ? 100 - score : null);
  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs">{DIMENSION_LABEL[name] ?? name}</p>
          {DIMENSION_DESCRIPTION[name] && (
            <p className="text-muted-foreground/50 text-[10px]">{DIMENSION_DESCRIPTION[name]}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {dim.status && (
            <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
              {dim.status}
            </span>
          )}
          <span className={cn('text-xs font-semibold tabular-nums', colorClass)}>
            {score !== null ? score : '—'}
          </span>
        </div>
      </div>
      {score !== null && (
        <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
          <div
            style={{ width: `${score}%` }}
            className={cn(
              'h-full rounded-full transition-all',
              colorClass.replace('text-', 'bg-').split(' ')[0],
            )}
          />
        </div>
      )}
    </div>
  );
}

export default function TodayEffortPage() {
  const { data, loading } = useToday();
  const { fatigue } = data;
  const { data: activities = [] } = useActivities();

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-4">
        <div className="bg-muted h-8 w-1/2 rounded" />
        <div className="bg-muted h-4 w-full rounded" />
        <div className="bg-muted h-4 w-3/4 rounded" />
      </div>
    );
  }

  if (!fatigue) {
    return (
      <div className="space-y-4 p-4">
        <Link className="text-muted-foreground text-sm" href="/">
          ← Aujourd'hui
        </Link>
        <p className="text-muted-foreground text-sm">Données de fatigue indisponibles.</p>
      </div>
    );
  }

  const today = new Date();
  const trainingLoad = computeTrainingLoad(
    activities.map((a) => ({ load: a.load, date: new Date(a.date) })),
    today,
  );

  // Chronic weekly average derived from acute/ACWR relationship
  const chronicWeeklyAvg =
    trainingLoad.acwr > 0 ? Math.round(trainingLoad.weeklyLoad / trainingLoad.acwr) : null;

  const signal = mapFatigueToSignal(
    fatigue.fatigueLevel as FatigueLevel,
    fatigue.trajectory as FatigueTrajectory,
  );
  const scoreClass = mapScoreToColorClass(
    fatigue.fatigueIndex !== null ? 100 - fatigue.fatigueIndex : null,
  );
  const fatigueTypeLabel = mapFatigueTypeToLabel(fatigue.fatigueType as FatigueType);
  const overreachingDisplay = OVERREACHING_RISK_DISPLAY[fatigue.signals.functionalOverreachingRisk];
  const performancePercent =
    fatigue.performanceImpairmentEstimate > 0
      ? Math.round((1 - fatigue.performanceImpairmentEstimate) * 100)
      : null;

  const verdictDisplay =
    FATIGUE_VERDICT_DISPLAY[fatigue.decision.verdict] ?? FATIGUE_VERDICT_DISPLAY.INSUFFICIENT_DATA;

  const acwrZone = acwrZoneDisplay(trainingLoad.acwr);

  const confidencePct = Math.round(fatigue.confidence * 100);
  const confidenceTier = mapConfidenceToTier(fatigue.confidence);
  const confidenceDisplay = CONFIDENCE_TIER_LABEL[confidenceTier];
  const completenessLabel =
    COMPLETENESS_LABEL[fatigue.dataCompleteness] ?? fatigue.dataCompleteness;

  const availableDimCount = Object.values(fatigue.dimensions).filter((d) => d.available).length;

  return (
    <div className="space-y-6 p-4">
      <Link
        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        href="/"
      >
        ← Aujourd'hui
      </Link>

      {/* Score header */}
      <div className="space-y-1">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Charge d'effort
        </p>
        <div className="flex items-baseline gap-3">
          <span className={cn('text-5xl font-bold tabular-nums', scoreClass)}>
            {fatigue.fatigueIndex !== null ? fatigue.fatigueIndex : '—'}
          </span>
          <span className={cn('flex items-center gap-1 text-sm font-medium', signal.qualityClass)}>
            {signal.label}
            <span aria-hidden>{signal.arrow}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
          {fatigueTypeLabel && fatigue.fatigueType !== 'UNDETERMINED' && (
            <span className="text-muted-foreground text-xs">
              Type : <span className="text-foreground font-medium">{fatigueTypeLabel}</span>
            </span>
          )}
          {fatigue.consecutiveAccumulationDays > 0 && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              {fatigue.consecutiveAccumulationDays === 1
                ? "1 jour d'accumulation consécutif"
                : `${fatigue.consecutiveAccumulationDays} jours d'accumulation consécutifs`}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {fatigue.estimatedTimeToFresh !== null && fatigue.estimatedTimeToFresh > 0 && (
            <span className="text-muted-foreground text-xs">
              Récupération estimée dans{' '}
              <span className="text-foreground font-medium">
                {fatigue.estimatedTimeToFresh === 1
                  ? '1 jour'
                  : `${fatigue.estimatedTimeToFresh} jours`}
              </span>
            </span>
          )}
          {performancePercent !== null && performancePercent < 100 && (
            <span className="text-muted-foreground text-xs">
              Capacité actuelle :{' '}
              <span className="text-foreground font-medium">~{performancePercent}%</span>
            </span>
          )}
        </div>
      </div>

      {/* Decision directive */}
      <div
        className={cn(
          'rounded-2xl border px-5 py-4',
          fatigue.decision.verdict === 'BUILD'
            ? 'border-emerald-500/30 bg-emerald-500/8'
            : fatigue.decision.verdict === 'MAINTAIN'
              ? 'border-blue-500/30 bg-blue-500/8'
              : fatigue.decision.verdict === 'REDUCE' ||
                  fatigue.decision.verdict === 'REST_WEEK' ||
                  fatigue.decision.verdict === 'TAPER'
                ? 'border-amber-500/30 bg-amber-500/8'
                : 'bg-card/60',
        )}
      >
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Directive de charge
        </p>
        <p className={cn('mt-1 text-sm font-semibold', verdictDisplay.colorClass)}>
          {verdictDisplay.label}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">{verdictDisplay.description}</p>
      </div>

      {/* Training capacity */}
      <div className="bg-card/60 rounded-2xl border px-5 py-4">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Capacité d'entraînement
        </p>
        <p className="mt-1 text-sm font-semibold">
          {mapFatigueCapacityLabel(fatigue.trainingCapacity as TrainingCapacity)}
        </p>
        {fatigue.decision.rationale.length > 0 && (
          <ul className="mt-2 space-y-1">
            {fatigue.decision.rationale.map((r, i) => (
              <li
                key={i}
                className="text-muted-foreground text-xs before:mr-1.5 before:content-['·']"
              >
                {resolve(r)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Load metrics — ACWR with zone context */}
      {(trainingLoad.weeklyLoad > 0 || trainingLoad.acwr > 0) && (
        <div className="bg-card/60 space-y-3 rounded-2xl border px-5 py-4">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
            Charge d'entraînement
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground text-[10px]">Charge 7 jours</p>
              <p className="text-sm font-semibold tabular-nums">
                {trainingLoad.weeklyLoad > 0 ? `${trainingLoad.weeklyLoad} TSS` : '—'}
              </p>
              <p className="text-muted-foreground text-[10px]">charge aiguë</p>
            </div>
            {chronicWeeklyAvg !== null && (
              <div>
                <p className="text-muted-foreground text-[10px]">Charge base (42j)</p>
                <p className="text-sm font-semibold tabular-nums">{chronicWeeklyAvg} TSS/sem</p>
                <p className="text-muted-foreground text-[10px]">charge chronique</p>
              </div>
            )}
          </div>
          {trainingLoad.acwr > 0 && (
            <div className="border-border/50 border-t pt-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-muted-foreground text-[10px]">ACWR (ratio aigu / chronique)</p>
                  <p className="text-muted-foreground/60 text-[10px]">
                    Source : Gabbett 2016 — sweet spot 0.8–1.3
                  </p>
                </div>
                <div className="text-right">
                  <p className={cn('text-sm font-semibold tabular-nums', acwrZone.colorClass)}>
                    {trainingLoad.acwr.toFixed(2)}
                  </p>
                  <p className={cn('text-[10px] font-medium', acwrZone.colorClass)}>
                    {acwrZone.label}
                  </p>
                </div>
              </div>
              {acwrZone.description && (
                <p className="text-muted-foreground mt-1.5 text-[10px]">{acwrZone.description}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dominant dimension callout */}
      {fatigue.dominantDimension && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/8 px-5 py-4">
          <p className="text-[11px] font-medium tracking-[0.15em] text-amber-600 uppercase dark:text-amber-400">
            Dimension dominante
          </p>
          <p className="mt-1 text-sm font-semibold">
            {DOMINANT_LABEL[fatigue.dominantDimension] ?? fatigue.dominantDimension}
          </p>
          {fatigue.primaryLimitingFactor && (
            <p className="text-muted-foreground mt-1 text-xs">{fatigue.primaryLimitingFactor}</p>
          )}
        </div>
      )}

      {/* Dimension breakdown */}
      <div className="bg-card/60 space-y-4 rounded-2xl border px-5 py-4">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Détail par dimension
        </p>
        <div className="space-y-4">
          {Object.entries(fatigue.dimensions).map(([key, dim]) => (
            <DimensionBar key={key} dim={dim} name={key} />
          ))}
        </div>
      </div>

      {/* Key evidence */}
      {fatigue.recommendation.keyEvidence.length > 0 && (
        <div className="bg-card/40 space-y-2 rounded-2xl border px-5 py-4">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
            Signaux clés
          </p>
          <ul className="space-y-1">
            {fatigue.recommendation.keyEvidence.map((e, i) => (
              <li
                key={i}
                className="text-muted-foreground text-xs before:mr-1.5 before:content-['·']"
              >
                {resolve(e)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Confidence + data quality */}
      <div className="bg-card/40 rounded-2xl border px-5 py-4">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Fiabilité du score
        </p>
        <div className="mt-3 grid grid-cols-3 gap-4">
          <div>
            <p className="text-muted-foreground text-[10px]">Confiance</p>
            <p className={cn('text-sm font-semibold tabular-nums', confidenceDisplay?.colorClass)}>
              {confidencePct}%
            </p>
            <p className="text-muted-foreground text-[10px]">{confidenceDisplay?.label}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px]">Dimensions actives</p>
            <p className="text-sm font-semibold tabular-nums">{availableDimCount} / 5</p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px]">Données</p>
            <p className="text-sm font-semibold">{completenessLabel}</p>
          </div>
        </div>
      </div>

      {/* Functional overreaching risk — show MODERATE+ */}
      {overreachingDisplay && (
        <div className="space-y-1 rounded-2xl border border-orange-500/20 bg-orange-500/5 px-5 py-4">
          <p className="text-[11px] font-medium tracking-[0.15em] text-orange-600 uppercase dark:text-orange-400">
            Alerte
          </p>
          <p className={cn('text-xs font-medium', overreachingDisplay.colorClass)}>
            ⚠ Surmenage fonctionnel — {overreachingDisplay.label}
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToday } from '@/hooks/use-today';
import { resolve } from '@/lib/french';
import {
  mapFatigueToSignal,
  mapFatigueCapacityLabel,
  mapFatigueTypeToLabel,
  mapScoreToColorClass,
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

function DimensionBar({ name, dim }: { name: string; dim: DimensionResult }) {
  if (!dim.available) return null;
  const { score } = dim;
  const colorClass = mapScoreToColorClass(score !== null ? 100 - score : null);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs">{DIMENSION_LABEL[name] ?? name}</p>
        <div className="flex items-center gap-2">
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
        <div className="space-y-3">
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

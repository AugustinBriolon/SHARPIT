'use client';

import { formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { resolve } from '@/lib/french';
import {
  mapConfidenceToTier,
  mapConsistencyToAthleteDisplay,
  type OverallVerdict,
} from '@/lib/today-mapping';
import { arbitrateModelConflict } from '@/core/inference/reasoning/scoring';
import type { LimitingFactor, PhysiologicalConsistency } from '@/hooks/use-today';
import type { ModelDirections } from '@/core/inference/reasoning/types';

export function ConfidencePanel({
  confidence,
  availableModelCount,
  physiologicalConsistency,
  consistencyScore,
  computedAt,
  dataCompleteness,
  recoveryDimCount,
  limitingFactor,
  overallVerdict,
  modelDirections,
}: {
  confidence: number;
  availableModelCount: number;
  physiologicalConsistency: PhysiologicalConsistency;
  consistencyScore: number;
  computedAt: string;
  dataCompleteness: string;
  recoveryDimCount: number;
  limitingFactor: LimitingFactor;
  overallVerdict: OverallVerdict;
  modelDirections?: ModelDirections;
}) {
  const pct = Math.round(confidence * 100);
  const tier = mapConfidenceToTier(confidence);

  const arbitrationWinner =
    physiologicalConsistency === 'CONFLICTING' && modelDirections
      ? arbitrateModelConflict(modelDirections, overallVerdict, limitingFactor)
      : null;

  const consistencyDisplay = mapConsistencyToAthleteDisplay(
    physiologicalConsistency,
    consistencyScore,
    overallVerdict,
    arbitrationWinner,
  );

  const TIER_STROKE: Record<string, string> = {
    high: '#10b981',
    medium: '#f59e0b',
    low: '#94a3b8',
  };
  const TIER_COLOR_CLASS: Record<string, string> = {
    high: 'text-emerald-600 dark:text-emerald-400',
    medium: 'text-amber-600 dark:text-amber-400',
    low: 'text-slate-400',
  };
  const ringStroke = TIER_STROKE[tier] ?? '#94a3b8';
  const tierColorClass = TIER_COLOR_CLASS[tier] ?? 'text-slate-400';

  const size = 96;
  const r = 38;
  const circ = 2 * Math.PI * r;
  const filled = circ * (pct / 100);
  const gap = circ - filled;

  const COMPLETENESS_LABEL: Record<string, string> = {
    FULL: 'Complètes',
    PARTIAL: 'Partielles',
    SPARSE: 'Éparses',
    INSUFFICIENT: 'Insuffisantes',
  };
  const completenessLabel = COMPLETENESS_LABEL[dataCompleteness] ?? dataCompleteness;

  const freshness = (() => {
    try {
      return formatDistanceToNowStrict(new Date(computedAt), { locale: fr, addSuffix: true });
    } catch {
      return null;
    }
  })();

  const summaryText = (() => {
    const models =
      availableModelCount === 1 ? '1 modèle actif' : `${availableModelCount} modèles actifs`;
    if (dataCompleteness === 'INSUFFICIENT')
      return `${models} · données insuffisantes — synchronise tes appareils`;
    if (tier === 'high')
      return `${models} · données ${completenessLabel.toLowerCase()} · bilan fiable`;
    if (tier === 'medium')
      return `${models} · données ${completenessLabel.toLowerCase()} · confiance modérée`;
    return `${models} · données ${completenessLabel.toLowerCase()} · score indicatif`;
  })();

  const summaryColorClass = TIER_COLOR_CLASS[tier] ?? 'text-slate-400';

  return (
    <div className="bg-card flex flex-col rounded-2xl border px-5 py-5">
      <p className="mb-4 text-[10px] font-semibold text-slate-500 uppercase dark:text-slate-400">
        Confiance SHARPIT
      </p>
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <svg height={size} viewBox={`0 0 ${size} ${size}`} width={size} aria-hidden>
            <circle
              cx={size / 2}
              cy={size / 2}
              fill="none"
              r={r}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={7}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              fill="none"
              r={r}
              stroke={ringStroke}
              strokeDasharray={`${filled} ${gap}`}
              strokeLinecap="round"
              strokeWidth={7}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('text-2xl leading-none font-bold tabular-nums', tierColorClass)}>
              {pct}
            </span>
            <span className="text-[9px] text-slate-400">/ 100</span>
          </div>
        </div>

        <div className="border-border/60 w-full space-y-2 border-t pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Modèles actifs</span>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              {availableModelCount} / 3
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Signaux récup.</span>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              {recoveryDimCount} / 4
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">Données</span>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
              {completenessLabel}
            </span>
          </div>
          {freshness && (
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Actualisé</span>
              <span className="text-[11px] text-slate-400 tabular-nums">{freshness}</span>
            </div>
          )}
        </div>

        <div className="border-border/60 w-full border-t pt-3">
          <p className={cn('text-[10px] leading-snug font-medium', consistencyDisplay.colorClass)}>
            {consistencyDisplay.label}
          </p>
          {consistencyDisplay.detail && (
            <p className="text-muted-foreground mt-1 text-[9px] leading-snug">
              {consistencyDisplay.detail}
            </p>
          )}
        </div>

        <div className="border-border/60 w-full border-t pt-3">
          <p className={cn('text-[10px] leading-snug', summaryColorClass)}>{summaryText}</p>
        </div>

        {limitingFactor.actionable && limitingFactor.description && (
          <div className="border-border/60 w-full border-t pt-3">
            <p className="text-[9px] leading-snug text-amber-600 dark:text-amber-400">
              ⚠ {resolve(limitingFactor.description)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

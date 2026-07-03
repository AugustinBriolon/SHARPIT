'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToday } from '@/hooks/use-today';
import { resolve } from '@/lib/french';
import {
  mapRecoveryToSignal,
  mapScoreToColorClass,
  mapRecoveryIntensityLabel,
  mapAutonomicBalanceToDisplay,
  mapSubjectiveWellnessToDisplay,
  mapLoadStressContextToDisplay,
  type ReadinessCategory,
  type RecommendedIntensity,
  type AutonomicBalance,
  type SubjectiveWellness,
  type LoadStressContext,
} from '@/lib/today-mapping';
import type { DimensionResult } from '@/hooks/use-today';

// ─────────────────────────────────────────────────────────────────────────────
// Recovery detail page — /today/recovery
// ─────────────────────────────────────────────────────────────────────────────

const DIMENSION_LABEL: Record<string, string> = {
  autonomic: 'Système autonome',
  sleep: 'Sommeil',
  subjective: 'Bien-être subjectif',
  loadContext: 'Contexte de charge',
};

const PRIMARY_LIMITER_LABEL: Record<string, string> = {
  autonomic: 'Système nerveux autonome',
  sleep: 'Qualité du sommeil',
  subjective: 'Bien-être subjectif',
  loadContext: 'Contexte de charge',
};

function DimensionBar({ name, dim }: { name: string; dim: DimensionResult }) {
  if (!dim.available) return null;
  const { score } = dim;
  const colorClass = mapScoreToColorClass(score);
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

function SignalChip({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        colorClass,
      )}
    >
      {label}
    </span>
  );
}

const RISK_DISPLAY: Record<string, { label: string; colorClass: string } | undefined> = {
  MODERATE: { label: 'Risque modéré', colorClass: 'text-amber-600 dark:text-amber-400' },
  HIGH: { label: 'Risque élevé', colorClass: 'text-orange-600 dark:text-orange-400' },
  CRITICAL: { label: 'Risque critique', colorClass: 'text-red-600 dark:text-red-400' },
};

const ILLNESS_RISK_DISPLAY: Record<string, { label: string; colorClass: string } | undefined> = {
  ELEVATED: { label: 'Risque modéré', colorClass: 'text-amber-600 dark:text-amber-400' },
  HIGH: { label: 'Risque élevé', colorClass: 'text-red-600 dark:text-red-400' },
};

export default function TodayRecoveryPage() {
  const { data, loading } = useToday();
  const { recovery } = data;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4 p-4">
        <div className="bg-muted h-8 w-1/2 rounded" />
        <div className="bg-muted h-4 w-full rounded" />
        <div className="bg-muted h-4 w-3/4 rounded" />
      </div>
    );
  }

  if (!recovery) {
    return (
      <div className="space-y-4 p-4">
        <Link className="text-muted-foreground text-sm" href="/">
          ← Aujourd'hui
        </Link>
        <p className="text-muted-foreground text-sm">Données de récupération indisponibles.</p>
      </div>
    );
  }

  const signal = mapRecoveryToSignal(recovery.readinessCategory as ReadinessCategory);
  const scoreClass = mapScoreToColorClass(recovery.readinessScore);
  const autonomicDisplay = mapAutonomicBalanceToDisplay(
    recovery.signals.autonomicBalance as AutonomicBalance,
  );
  const wellnessDisplay = mapSubjectiveWellnessToDisplay(
    recovery.signals.subjectiveWellness as SubjectiveWellness,
  );
  const loadDisplay = mapLoadStressContextToDisplay(
    recovery.signals.loadStressContext as LoadStressContext,
  );
  const overreachingDisplay = RISK_DISPLAY[recovery.signals.overreachingRisk];
  const illnessDisplay = ILLNESS_RISK_DISPLAY[recovery.signals.illnessRisk];
  const limiterLabel = recovery.primaryLimitingFactor
    ? (PRIMARY_LIMITER_LABEL[recovery.primaryLimitingFactor] ?? recovery.primaryLimitingFactor)
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
          Récupération
        </p>
        <div className="flex items-baseline gap-3">
          <span className={cn('text-5xl font-bold tabular-nums', scoreClass)}>
            {recovery.readinessScore !== null ? recovery.readinessScore : '—'}
          </span>
          <span className={cn('flex items-center gap-1 text-sm font-medium', signal.qualityClass)}>
            {signal.label}
            <span aria-hidden>{signal.arrow}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {limiterLabel && (
            <span className="text-muted-foreground text-xs">
              Facteur limitant : <span className="text-foreground font-medium">{limiterLabel}</span>
            </span>
          )}
          {recovery.estimatedTimeToFullRecovery !== null &&
            recovery.estimatedTimeToFullRecovery > 0 && (
              <span className="text-muted-foreground text-xs">
                Récupération estimée dans{' '}
                <span className="text-foreground font-medium">
                  {recovery.estimatedTimeToFullRecovery === 1
                    ? '1 jour'
                    : `${recovery.estimatedTimeToFullRecovery} jours`}
                </span>
              </span>
            )}
        </div>
      </div>

      {/* Intensity recommendation */}
      <div className="bg-card/60 rounded-2xl border px-5 py-4">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Intensité recommandée
        </p>
        <p className="mt-1 text-sm font-semibold">
          {mapRecoveryIntensityLabel(
            recovery.decision.recommendedIntensity as RecommendedIntensity,
          )}
        </p>
        {recovery.decision.rationale.length > 0 && (
          <ul className="mt-2 space-y-1">
            {recovery.decision.rationale.map((r, i) => (
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

      {/* Physiological signals */}
      <div className="bg-card/60 space-y-4 rounded-2xl border px-5 py-4">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Signaux physiologiques
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">Système autonome (VFC + FCR)</p>
            <SignalChip
              label={autonomicDisplay.label}
              colorClass={cn(
                'ring-current/20',
                autonomicDisplay.colorClass.replace('text-', 'text-').split(' ')[0],
              )}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">Bien-être subjectif</p>
            <SignalChip
              colorClass={cn('ring-current/20', wellnessDisplay.colorClass.split(' ')[0])}
              label={wellnessDisplay.label}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">Contexte de charge</p>
            <SignalChip
              colorClass={cn('ring-current/20', loadDisplay.colorClass.split(' ')[0])}
              label={loadDisplay.label}
            />
          </div>
          {recovery.signals.dissonanceDetected && (
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              ⚡ Signaux contradictoires — marqueurs objectifs et subjectifs divergent
            </p>
          )}
        </div>
      </div>

      {/* Dimension breakdown */}
      <div className="bg-card/60 space-y-4 rounded-2xl border px-5 py-4">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Détail par dimension
        </p>
        <div className="space-y-3">
          {Object.entries(recovery.dimensions).map(([key, dim]) => (
            <DimensionBar key={key} dim={dim} name={key} />
          ))}
        </div>
      </div>

      {/* Key evidence */}
      {recovery.recommendation.keyEvidence.length > 0 && (
        <div className="bg-card/40 space-y-2 rounded-2xl border px-5 py-4">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
            Signaux clés
          </p>
          <ul className="space-y-1">
            {recovery.recommendation.keyEvidence.map((e, i) => (
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

      {/* Risk flags — show MODERATE+ for overreaching, ELEVATED+ for illness */}
      {(overreachingDisplay || illnessDisplay) && (
        <div className="space-y-2 rounded-2xl border border-orange-500/20 bg-orange-500/5 px-5 py-4">
          <p className="text-[11px] font-medium tracking-[0.15em] text-orange-600 uppercase dark:text-orange-400">
            Alertes
          </p>
          {overreachingDisplay && (
            <p className={cn('text-xs font-medium', overreachingDisplay.colorClass)}>
              ⚠ Surmenage — {overreachingDisplay.label}
            </p>
          )}
          {illnessDisplay && (
            <p className={cn('text-xs font-medium', illnessDisplay.colorClass)}>
              ⚠ Activation immunitaire — {illnessDisplay.label}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

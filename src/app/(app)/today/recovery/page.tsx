'use client';

import Link from 'next/link';
import { isSameDay, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToday } from '@/hooks/use-today';
import { useHealthEntries } from '@/hooks/use-data';
import { resolve } from '@/lib/french';
import {
  mapRecoveryToSignal,
  mapScoreToColorClass,
  mapRecoveryIntensityLabel,
  mapAutonomicBalanceToDisplay,
  mapSubjectiveWellnessToDisplay,
  mapLoadStressContextToDisplay,
  mapConfidenceToTier,
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

const DIMENSION_DESCRIPTION: Record<string, string> = {
  autonomic: 'VFC + FC repos — équilibre sympathique / parasympathique',
  sleep: 'Durée, profondeur, continuité du sommeil',
  subjective: 'RPE perçu, stress, bien-être autodéclaré',
  loadContext: 'Charge aiguë et chronique vs capacité de récupération',
};

const PRIMARY_LIMITER_LABEL: Record<string, string> = {
  autonomic: 'Système nerveux autonome',
  sleep: 'Qualité du sommeil',
  subjective: 'Bien-être subjectif',
  loadContext: 'Contexte de charge',
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

// Shows all 4 dimensions — unavailable ones render greyed-out with reason
function DimensionBar({ name, dim }: { name: string; dim: DimensionResult }) {
  const { score, available } = dim;
  const colorClass = available ? mapScoreToColorClass(score) : 'text-muted-foreground';
  const barColorClass = available
    ? colorClass.replace('text-', 'bg-').split(' ')[0]
    : 'bg-muted-foreground/20';

  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={cn(
              'text-xs',
              available ? 'text-muted-foreground' : 'text-muted-foreground/60',
            )}
          >
            {DIMENSION_LABEL[name] ?? name}
          </p>
          <p className="text-muted-foreground/50 text-[10px]">{DIMENSION_DESCRIPTION[name]}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!available && (
            <span className="text-muted-foreground/50 text-[10px]">Signal manquant</span>
          )}
          {available && dim.status && (
            <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
              {dim.status}
            </span>
          )}
          <span className={cn('text-xs font-semibold tabular-nums', colorClass)}>
            {available && score !== null ? score : '—'}
          </span>
        </div>
      </div>
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full transition-all', barColorClass)}
          style={{ width: available && score !== null ? `${score}%` : '0%' }}
        />
      </div>
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
  const { data: healthEntries = [] } = useHealthEntries(7);

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

  const today = new Date();
  const todayEntry = healthEntries.find((e) => isSameDay(new Date(e.date), today)) ?? null;

  // 7-day average HRV and RHR for delta context
  const last7Valid = healthEntries.filter((e) => {
    const d = new Date(e.date);
    return d >= subDays(today, 6) && !isSameDay(d, today);
  });
  const avgHrv7d =
    last7Valid.filter((e) => e.hrv != null).length > 0
      ? Math.round(
          last7Valid.reduce((s, e) => s + (e.hrv ?? 0), 0) /
            last7Valid.filter((e) => e.hrv != null).length,
        )
      : null;
  const avgRhr7d =
    last7Valid.filter((e) => e.restingHr != null).length > 0
      ? Math.round(
          last7Valid.reduce((s, e) => s + (e.restingHr ?? 0), 0) /
            last7Valid.filter((e) => e.restingHr != null).length,
        )
      : null;

  const hrvDelta = todayEntry?.hrv != null && avgHrv7d != null ? todayEntry.hrv - avgHrv7d : null;
  const rhrDelta =
    todayEntry?.restingHr != null && avgRhr7d != null ? todayEntry.restingHr - avgRhr7d : null;

  // HRV vs personal baseline bands
  const hrvBaselineContext = (() => {
    const hrv = todayEntry?.hrv;
    const low = todayEntry?.hrvBaselineLow;
    const high = todayEntry?.hrvBaselineHigh;
    if (hrv == null || low == null || high == null) return null;
    if (hrv < low)
      return {
        label: `↓ sous norme (${low}–${high} ms)`,
        colorClass: 'text-amber-600 dark:text-amber-400',
      };
    if (hrv > high)
      return {
        label: `↑ au-dessus norme (${low}–${high} ms)`,
        colorClass: 'text-emerald-600 dark:text-emerald-400',
      };
    return {
      label: `→ dans la norme (${low}–${high} ms)`,
      colorClass: 'text-slate-400 dark:text-slate-500',
    };
  })();

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

  const isCalibrating = recovery.readinessCategory === 'BASELINE_PENDING';
  const availableDimCount = Object.values(recovery.dimensions).filter((d) => d.available).length;

  const confidencePct = Math.round(recovery.confidence * 100);
  const confidenceTier = mapConfidenceToTier(recovery.confidence);
  const confidenceDisplay = CONFIDENCE_TIER_LABEL[confidenceTier];
  const completenessLabel =
    COMPLETENESS_LABEL[recovery.dataCompleteness] ?? recovery.dataCompleteness;

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

      {/* Calibration callout — shown when BASELINE_PENDING */}
      {isCalibrating && (
        <div className="rounded-2xl border border-slate-300/60 bg-slate-50/60 px-5 py-4 dark:border-slate-700/40 dark:bg-slate-900/40">
          <p className="text-[11px] font-medium tracking-[0.15em] text-slate-500 uppercase">
            Calibration en cours
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {availableDimCount} signal{availableDimCount > 1 ? 's' : ''} sur 4 actifs
          </p>
          <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
            Le score de récupération est calculé à partir de 4 dimensions physiologiques. Il ne
            s&apos;affiche qu&apos;à partir de 2 signaux disponibles. Synchronise ta montre pour
            activer VFC et données de sommeil.
          </p>
        </div>
      )}

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

      {/* Raw biomarkers — HRV and RHR with personal baseline context */}
      {(todayEntry?.hrv != null || todayEntry?.restingHr != null) && (
        <div className="bg-card/60 space-y-3 rounded-2xl border px-5 py-4">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
            Marqueurs bruts
          </p>
          {todayEntry?.hrv != null && (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs">VFC (variabilité cardiaque)</p>
                <div className="flex items-center gap-2">
                  {hrvDelta !== null && (
                    <span
                      className={cn(
                        'text-[10px] font-medium tabular-nums',
                        hrvDelta > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400',
                      )}
                    >
                      {hrvDelta > 0 ? '+' : ''}
                      {hrvDelta} vs 7j
                    </span>
                  )}
                  <span className="text-xs font-semibold tabular-nums">{todayEntry.hrv} ms</span>
                </div>
              </div>
              {hrvBaselineContext && (
                <p className={cn('text-[10px]', hrvBaselineContext.colorClass)}>
                  {hrvBaselineContext.label}
                </p>
              )}
            </div>
          )}
          {todayEntry?.restingHr != null && (
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs">FC repos</p>
              <div className="flex items-center gap-2">
                {rhrDelta !== null && (
                  <span
                    className={cn(
                      'text-[10px] font-medium tabular-nums',
                      // For RHR: lower is better
                      rhrDelta < 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400',
                    )}
                  >
                    {rhrDelta > 0 ? '+' : ''}
                    {rhrDelta} vs 7j
                  </span>
                )}
                <span className="text-xs font-semibold tabular-nums">
                  {todayEntry.restingHr} bpm
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dimension breakdown — all 4 shown, unavailable greyed out */}
      <div className="bg-card/60 space-y-4 rounded-2xl border px-5 py-4">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Contribution au score (4 dimensions)
        </p>
        <div className="space-y-4">
          {Object.entries(recovery.dimensions).map(([key, dim]) => (
            <DimensionBar key={key} dim={dim} name={key} />
          ))}
        </div>
        <p className="text-muted-foreground/60 text-[10px]">
          Le score est synthétisé à partir des dimensions disponibles. Les dimensions manquantes
          réduisent la confiance du modèle.
        </p>
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
            <p className="text-muted-foreground text-[10px]">Signaux actifs</p>
            <p className="text-sm font-semibold tabular-nums">{availableDimCount} / 4</p>
            <p className="text-muted-foreground text-[10px]">dimensions</p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px]">Données</p>
            <p className="text-sm font-semibold">{completenessLabel}</p>
          </div>
        </div>
      </div>

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

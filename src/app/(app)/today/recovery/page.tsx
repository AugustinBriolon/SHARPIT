'use client';

import Link from 'next/link';
import { format, subDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  ReferenceArea,
} from 'recharts';
import { cn } from '@/lib/utils';
import { ArcGauge } from '@/components/ui/arc-gauge';
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
// Recovery analytical dashboard — /today/recovery
// ─────────────────────────────────────────────────────────────────────────────

const DIMENSION_LABEL: Record<string, string> = {
  autonomic: 'Système autonome',
  sleep: 'Sommeil',
  subjective: 'Bien-être subjectif',
  loadContext: 'Contexte de charge',
};

const DIMENSION_DESCRIPTION: Record<string, string> = {
  autonomic: 'VFC + FC repos',
  sleep: 'Durée, profondeur, continuité',
  subjective: 'RPE, stress, bien-être',
  loadContext: 'Charge aiguë vs chronique',
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

const RISK_DISPLAY: Record<string, { label: string; colorClass: string } | undefined> = {
  MODERATE: { label: 'Risque modéré', colorClass: 'text-amber-600 dark:text-amber-400' },
  HIGH: { label: 'Risque élevé', colorClass: 'text-orange-600 dark:text-orange-400' },
  CRITICAL: { label: 'Risque critique', colorClass: 'text-red-600 dark:text-red-400' },
};

const ILLNESS_RISK_DISPLAY: Record<string, { label: string; colorClass: string } | undefined> = {
  ELEVATED: { label: 'Risque modéré', colorClass: 'text-amber-600 dark:text-amber-400' },
  HIGH: { label: 'Risque élevé', colorClass: 'text-red-600 dark:text-red-400' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function DimensionRow({ name, dim }: { name: string; dim: DimensionResult }) {
  const { score, available } = dim;
  const colorClass = available ? mapScoreToColorClass(score) : 'text-muted-foreground/40';
  const barColorClass = available
    ? colorClass.replace('text-', 'bg-').split(' ')[0]
    : 'bg-muted-foreground/10';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className={cn('text-xs font-medium', available ? '' : 'text-muted-foreground/50')}>
            {DIMENSION_LABEL[name] ?? name}
          </p>
          <p className="text-muted-foreground/40 text-[10px]">{DIMENSION_DESCRIPTION[name]}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!available && (
            <span className="text-muted-foreground/40 text-[10px]">Signal manquant</span>
          )}
          {available && dim.status && (
            <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
              {dim.status}
            </span>
          )}
          <span className={cn('w-6 text-right text-sm font-bold tabular-nums', colorClass)}>
            {available && score !== null ? score : '—'}
          </span>
        </div>
      </div>
      <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColorClass)}
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
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-current/20 ring-inset',
        colorClass,
      )}
    >
      {label}
    </span>
  );
}

type SparkPoint = { date: string; value: number | null };

function MiniSparkline({
  data,
  color,
  unit,
  invertDelta,
  baselineLow,
  baselineHigh,
}: {
  data: SparkPoint[];
  color: string;
  unit: string;
  invertDelta?: boolean;
  baselineLow?: number | null;
  baselineHigh?: number | null;
}) {
  const valid = data.filter((d) => d.value !== null);
  if (valid.length < 2) return <p className="text-muted-foreground/40 text-xs">Pas de données</p>;

  const last = valid[valid.length - 1]?.value ?? null;
  const prev7 =
    valid.length >= 7
      ? valid.slice(-8, -1).reduce((s, d) => s + (d.value ?? 0), 0) /
        Math.min(7, valid.slice(-8, -1).length)
      : null;
  const delta = last !== null && prev7 !== null ? Math.round(last - prev7) : null;
  let deltaGood: boolean | null = null;
  if (delta !== null) {
    deltaGood = invertDelta ? delta < 0 : delta > 0;
  }

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-lg font-bold tabular-nums">
          {last !== null ? last : '—'}
          <span className="text-muted-foreground ml-1 text-[10px] font-normal">{unit}</span>
        </span>
        {delta !== null && (
          <span
            className={cn(
              'text-[10px] font-medium tabular-nums',
              deltaGood
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400',
            )}
          >
            {delta > 0 ? '+' : ''}
            {delta} vs 7j
          </span>
        )}
      </div>
      <ResponsiveContainer height={52} width="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <XAxis dataKey="date" hide />
          <YAxis domain={['auto', 'auto']} hide />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null;
              const pt = payload[0].payload as SparkPoint;
              return (
                <div className="bg-popover border-border rounded-lg border px-2 py-1 text-[10px] shadow-sm">
                  <p className="font-medium">{pt.value !== null ? `${pt.value} ${unit}` : '—'}</p>
                  <p className="text-muted-foreground">{pt.date}</p>
                </div>
              );
            }}
          />
          {baselineLow != null && baselineHigh != null && (
            <ReferenceArea fill="#10b981" fillOpacity={0.08} y1={baselineLow} y2={baselineHigh} />
          )}
          <Line dataKey="value" dot={false} stroke={color} strokeWidth={1.5} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function DualSparkline({
  data,
  colorA,
  colorB,
  labelA,
  labelB,
  unitA,
  unitB,
}: {
  data: { date: string; a: number | null; b: number | null }[];
  colorA: string;
  colorB: string;
  labelA: string;
  labelB: string;
  unitA: string;
  unitB: string;
}) {
  const hasData = data.some((d) => d.a !== null || d.b !== null);
  if (!hasData) return null;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-[10px]">
          <span className="inline-block h-1.5 w-3 rounded-full" style={{ background: colorA }} />
          {labelA}
        </span>
        <span className="flex items-center gap-1 text-[10px]">
          <span className="inline-block h-1.5 w-3 rounded-full" style={{ background: colorB }} />
          {labelB}
        </span>
      </div>
      <ResponsiveContainer height={52} width="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <XAxis dataKey="date" hide />
          <YAxis domain={['auto', 'auto']} hide />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const pt = payload[0]?.payload as {
                date: string;
                a: number | null;
                b: number | null;
              };
              return (
                <div className="bg-popover border-border rounded-lg border px-2 py-1 text-[10px] shadow-sm">
                  <p>{pt.a !== null ? `${labelA}: ${pt.a}${unitA}` : null}</p>
                  <p>{pt.b !== null ? `${labelB}: ${pt.b}${unitB}` : null}</p>
                  <p className="text-muted-foreground">{pt.date}</p>
                </div>
              );
            }}
          />
          <Line dataKey="a" dot={false} stroke={colorA} strokeWidth={1.5} type="monotone" />
          <Line dataKey="b" dot={false} stroke={colorB} strokeWidth={1.5} type="monotone" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TodayRecoveryPage() {
  const { data, loading } = useToday();
  const { recovery } = data;
  const { data: healthEntries = [] } = useHealthEntries(14);

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
        <Link className="text-muted-foreground block text-sm" href="/">
          ← Aujourd'hui
        </Link>
        <p className="text-muted-foreground text-sm">Données de récupération indisponibles.</p>
      </div>
    );
  }

  const today = new Date();
  const todayEntry = healthEntries.find((e) => isSameDay(new Date(e.date), today)) ?? null;

  // Build 14-day sparkline series
  const days14 = Array.from({ length: 14 }, (_, i) => subDays(today, 13 - i));
  const sparkHrv: SparkPoint[] = days14.map((d) => {
    const e = healthEntries.find((h) => isSameDay(new Date(h.date), d));
    return {
      date: format(d, 'dd MMM', { locale: fr }),
      value: e?.hrv ?? null,
    };
  });
  const sparkRhr: SparkPoint[] = days14.map((d) => {
    const e = healthEntries.find((h) => isSameDay(new Date(h.date), d));
    return {
      date: format(d, 'dd MMM', { locale: fr }),
      value: e?.restingHr ?? null,
    };
  });
  const dualData = days14.map((d) => {
    const e = healthEntries.find((h) => isSameDay(new Date(h.date), d));
    return {
      date: format(d, 'dd MMM', { locale: fr }),
      a: e?.bodyBattery ?? null,
      b: e?.stress ?? null,
    };
  });

  // HRV baseline from today's entry (personal band)
  const baselineLow = todayEntry?.hrvBaselineLow ?? null;
  const baselineHigh = todayEntry?.hrvBaselineHigh ?? null;

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

  const intensityLabel = mapRecoveryIntensityLabel(
    recovery.decision.recommendedIntensity as RecommendedIntensity,
  );

  return (
    <div className="space-y-4 p-4">
      <Link
        className="text-muted-foreground hover:text-foreground block text-sm transition-colors"
        href="/"
      >
        ← Aujourd'hui
      </Link>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Score hero */}
          <div className="bg-card/60 rounded-2xl border px-5 py-5">
            <p className="text-muted-foreground mb-3 text-[11px] font-medium uppercase">
              Récupération
            </p>
            <div className="flex items-center gap-5">
              <ArcGauge score={recovery.readinessScore} size={96} strokeWidth={7} />
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'flex items-center gap-1 text-sm font-semibold',
                      signal.qualityClass,
                    )}
                  >
                    {signal.label}
                    <span aria-hidden>{signal.arrow}</span>
                  </span>
                  {isCalibrating && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                      Calibration
                    </span>
                  )}
                </div>
                {limiterLabel && (
                  <p className="text-muted-foreground text-xs">
                    Facteur limitant :{' '}
                    <span className="text-foreground font-medium">{limiterLabel}</span>
                  </p>
                )}
                {recovery.estimatedTimeToFullRecovery !== null &&
                  recovery.estimatedTimeToFullRecovery > 0 && (
                    <p className="text-muted-foreground text-xs">
                      Récupération dans{' '}
                      <span className="text-foreground font-medium">
                        {recovery.estimatedTimeToFullRecovery === 1
                          ? '1 jour'
                          : `${recovery.estimatedTimeToFullRecovery} jours`}
                      </span>
                    </p>
                  )}
              </div>
            </div>

            {isCalibrating && (
              <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                {availableDimCount} signal{availableDimCount > 1 ? 's' : ''} sur 4 actifs.
                Synchronise ta montre pour activer VFC et données de sommeil.
              </p>
            )}
          </div>

          {/* 4 Dimension bars */}
          <div className="bg-card/60 space-y-3 rounded-2xl border px-5 py-4">
            <p className="text-muted-foreground text-[11px] font-medium uppercase">
              Contribution au score
            </p>
            <div className="space-y-3">
              {Object.entries(recovery.dimensions).map(([key, dim]) => (
                <DimensionRow key={key} dim={dim} name={key} />
              ))}
            </div>
            <p className="text-muted-foreground/50 text-[10px]">
              Dimensions manquantes réduisent la confiance du modèle.
            </p>
          </div>

          {/* Signal chips */}
          <div className="bg-card/60 space-y-3 rounded-2xl border px-5 py-4">
            <p className="text-muted-foreground text-[11px] font-medium uppercase">
              Signaux physiologiques
            </p>
            <div className="flex flex-wrap gap-2">
              <SignalChip
                colorClass={cn('ring-current/20', autonomicDisplay.colorClass.split(' ')[0])}
                label={autonomicDisplay.label}
              />
              <SignalChip
                colorClass={cn('ring-current/20', wellnessDisplay.colorClass.split(' ')[0])}
                label={wellnessDisplay.label}
              />
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

          {/* Decision */}
          <div className="bg-card/60 rounded-2xl border px-5 py-4">
            <p className="text-muted-foreground text-[11px] font-medium uppercase">
              Intensité recommandée
            </p>
            <p className={cn('mt-1 text-sm font-semibold', scoreClass)}>{intensityLabel}</p>
            {recovery.decision.rationale.length > 0 && (
              <ul className="mt-2 space-y-1">
                {recovery.decision.rationale.slice(0, 3).map((r, i) => (
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

          {/* Risk alerts */}
          {(overreachingDisplay || illnessDisplay) && (
            <div className="space-y-2 rounded-2xl border border-orange-500/20 bg-orange-500/5 px-5 py-4">
              <p className="text-[11px] font-medium text-orange-600 uppercase dark:text-orange-400">
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

        {/* ── RIGHT COLUMN ────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* HRV sparkline */}
          <div className="bg-card/60 rounded-2xl border px-4 py-4">
            <p className="text-muted-foreground mb-2 text-[11px] font-medium uppercase">
              VFC — 14 jours
            </p>
            <MiniSparkline
              baselineHigh={baselineHigh}
              baselineLow={baselineLow}
              color="#10b981"
              data={sparkHrv}
              unit="ms"
            />
            {baselineLow != null && baselineHigh != null && (
              <p className="text-muted-foreground/50 mt-1 text-[10px]">
                Zone verte = norme personnelle ({baselineLow}–{baselineHigh} ms)
              </p>
            )}
          </div>

          {/* RHR sparkline */}
          <div className="bg-card/60 rounded-2xl border px-4 py-4">
            <p className="text-muted-foreground mb-2 text-[11px] font-medium uppercase">
              FC repos — 14 jours
            </p>
            <MiniSparkline color="#f59e0b" data={sparkRhr} unit="bpm" invertDelta />
          </div>

          {/* Body battery + Stress dual */}
          <div className="bg-card/60 rounded-2xl border px-4 py-4">
            <p className="text-muted-foreground mb-2 text-[11px] font-medium uppercase">
              Énergie & Stress — 14 jours
            </p>
            <DualSparkline
              colorA="#10b981"
              colorB="#f59e0b"
              data={dualData}
              labelA="Batterie"
              labelB="Stress"
              unitA=""
              unitB=""
            />
            {dualData.every((d) => d.a === null && d.b === null) && (
              <p className="text-muted-foreground/40 text-xs">Pas de données</p>
            )}
          </div>

          {/* Confidence block */}
          <div className="bg-card/40 rounded-2xl border px-4 py-4">
            <p className="text-muted-foreground mb-3 text-[11px] font-medium uppercase">
              Fiabilité
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-muted-foreground text-[10px]">Confiance</p>
                <p className={cn('text-sm font-bold tabular-nums', confidenceDisplay?.colorClass)}>
                  {confidencePct}%
                </p>
                <p className="text-muted-foreground text-[10px]">{confidenceDisplay?.label}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px]">Signaux</p>
                <p className="text-sm font-bold tabular-nums">{availableDimCount} / 4</p>
                <p className="text-muted-foreground text-[10px]">dims actives</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px]">Données</p>
                <p className="text-sm font-bold">{completenessLabel}</p>
              </div>
            </div>
          </div>

          {/* Key evidence */}
          {recovery.recommendation.keyEvidence.length > 0 && (
            <div className="bg-card/40 space-y-2 rounded-2xl border px-4 py-4">
              <p className="text-muted-foreground text-[11px] font-medium uppercase">
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
        </div>
      </div>
    </div>
  );
}

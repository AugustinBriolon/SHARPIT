'use client';

import Link from 'next/link';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { ArcGauge } from '@/components/ui/arc-gauge';
import { useToday } from '@/hooks/use-today';
import { useActivities } from '@/hooks/use-data';
import { computeTrainingLoad } from '@/lib/training-load';
import { computePmcSeries } from '@/lib/analytics';
import { resolve, resolveCode } from '@/lib/french';
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
// Effort analytical dashboard — /today/effort
// ─────────────────────────────────────────────────────────────────────────────

const DIMENSION_LABEL: Record<string, string> = {
  load: "Charge d'entraînement",
  neuromuscular: 'Neuromusculaire',
  metabolic: 'Métabolique',
  cumulative: 'Cumulative',
  psychological: 'Psychologique',
};

const DIMENSION_DESCRIPTION: Record<string, string> = {
  load: 'TSS, ACWR, tendance',
  neuromuscular: 'Force, vitesse, récupération musculaire',
  metabolic: 'Volume intensité, dette lactique',
  cumulative: 'Accumulation multi-semaines',
  psychological: 'Stress, motivation, charge mentale',
};

const DOMINANT_LABEL: Record<string, string> = {
  LOAD: 'Charge excessive',
  NEUROMUSCULAR: 'Fatigue neuromusculaire',
  METABOLIC: 'Fatigue métabolique',
  CUMULATIVE: 'Accumulation chronique',
  PSYCHOLOGICAL: 'Fatigue psychologique',
  load: 'Charge excessive',
  neuromuscular: 'Fatigue neuromusculaire',
  metabolic: 'Fatigue métabolique',
  cumulative: 'Accumulation chronique',
  psychological: 'Fatigue psychologique',
};

const DOMINANT_LABEL_LOW_FATIGUE: Record<string, string> = {
  LOAD: 'Charge actuelle',
  NEUROMUSCULAR: 'Neuromusculaire',
  METABOLIC: 'Métabolique',
  CUMULATIVE: 'Historique de charge',
  PSYCHOLOGICAL: 'Psychologique',
  load: 'Charge actuelle',
  neuromuscular: 'Neuromusculaire',
  metabolic: 'Métabolique',
  cumulative: 'Historique de charge',
  psychological: 'Psychologique',
};

const OVERREACHING_RISK_DISPLAY: Record<string, { label: string; colorClass: string } | undefined> =
  {
    MODERATE: { label: 'Risque modéré', colorClass: 'text-amber-600 dark:text-amber-400' },
    HIGH: { label: 'Risque élevé', colorClass: 'text-orange-600 dark:text-orange-400' },
    CRITICAL: { label: 'Risque critique', colorClass: 'text-red-600 dark:text-red-400' },
  };

const FATIGUE_VERDICT_DISPLAY: Record<
  string,
  { label: string; colorClass: string; borderClass: string; bgClass: string }
> = {
  BUILD: {
    label: 'Progresser',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    borderClass: 'border-emerald-500/30',
    bgClass: 'bg-emerald-500/8',
  },
  MAINTAIN: {
    label: 'Maintenir',
    colorClass: 'text-blue-600 dark:text-blue-400',
    borderClass: 'border-blue-500/30',
    bgClass: 'bg-blue-500/8',
  },
  REDUCE: {
    label: 'Réduire la charge',
    colorClass: 'text-amber-600 dark:text-amber-400',
    borderClass: 'border-amber-500/30',
    bgClass: 'bg-amber-500/8',
  },
  REST_WEEK: {
    label: 'Semaine de récupération',
    colorClass: 'text-orange-600 dark:text-orange-400',
    borderClass: 'border-amber-500/30',
    bgClass: 'bg-amber-500/8',
  },
  TAPER: {
    label: 'Affûtage',
    colorClass: 'text-blue-600 dark:text-blue-400',
    borderClass: 'border-blue-500/30',
    bgClass: 'bg-blue-500/8',
  },
  INSUFFICIENT_DATA: {
    label: 'Données insuffisantes',
    colorClass: 'text-muted-foreground',
    borderClass: '',
    bgClass: 'bg-card/60',
  },
};

const VERDICT_DESCRIPTION: Record<string, string> = {
  BUILD: 'La charge peut être augmentée pour stimuler les adaptations.',
  MAINTAIN: 'La charge actuelle est adaptée — ne pas augmenter ni réduire.',
  REDUCE: 'La fatigue dépasse la capacité de récupération — lever le pied.',
  REST_WEEK: 'La fatigue accumulée nécessite une semaine de décharge complète.',
  TAPER: 'Réduction progressive de la charge pour optimiser la forme en compétition.',
  INSUFFICIENT_DATA: 'Pas assez de données pour formuler une directive de charge.',
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function DimensionRow({ name, dim }: { name: string; dim: DimensionResult }) {
  if (!dim.available) {
    return (
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-muted-foreground/50 text-xs">{DIMENSION_LABEL[name] ?? name}</p>
            <p className="text-muted-foreground/30 text-[10px]">{DIMENSION_DESCRIPTION[name]}</p>
          </div>
          <span className="text-muted-foreground/40 text-[10px]">Signal manquant</span>
        </div>
        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
          <div className="bg-muted-foreground/10 h-full w-0 rounded-full" />
        </div>
      </div>
    );
  }

  const { score } = dim;
  // Fatigue dimension: high score = bad → invert color
  const colorScore = score !== null ? 100 - score : null;
  const colorClass = mapScoreToColorClass(colorScore);
  const [barColorClass] = colorClass.replace('text-', 'bg-').split(' ');

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-medium">{DIMENSION_LABEL[name] ?? name}</p>
          <p className="text-muted-foreground/50 text-[10px]">{DIMENSION_DESCRIPTION[name]}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {dim.status && (
            <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
              {dim.status}
            </span>
          )}
          <span className={cn('w-6 text-right text-sm font-bold tabular-nums', colorClass)}>
            {score !== null ? score : '—'}
          </span>
        </div>
      </div>
      {score !== null && (
        <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
          <div
            className={cn('h-full rounded-full transition-all duration-500', barColorClass)}
            style={{ width: `${score}%` }}
          />
        </div>
      )}
    </div>
  );
}

function AcwrZoneBar({ acwr }: { acwr: number }) {
  if (acwr <= 0) return null;

  const zones = [
    { label: 'Sous-charge', min: 0, max: 0.9, color: '#3b82f6' },
    { label: 'Optimal', min: 0.9, max: 1.3, color: '#10b981' },
    { label: 'Alerte', min: 1.3, max: 1.5, color: '#f59e0b' },
    { label: 'Danger', min: 1.5, max: 2.0, color: '#ef4444' },
  ];

  const totalRange = 2.0;
  const markerPct = Math.min((acwr / totalRange) * 100, 100);
  const activeZone = zones.find((z) => acwr >= z.min && acwr < z.max) ?? zones[zones.length - 1];

  return (
    <>
      <div className="relative h-3">
        <div className="absolute inset-x-0 top-1/2 flex h-3 w-full -translate-y-1/2 overflow-hidden rounded-full">
          {zones.map((z) => {
            const width = ((z.max - z.min) / totalRange) * 100;
            return (
              <div
                key={z.label}
                className="h-full"
                style={{ width: `${width}%`, background: z.color, opacity: 0.7 }}
              />
            );
          })}
        </div>

        <div
          className="pointer-events-none absolute top-0 z-10 flex h-6 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-between"
          style={{ left: `${markerPct}%` }}
          aria-hidden
        >
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] leading-none font-bold text-white tabular-nums shadow-sm"
            style={{ backgroundColor: activeZone.color }}
          >
            {acwr.toFixed(2)}
          </span>
          <span
            className="h-full w-1 rounded-full border-2 border-white shadow-md"
            style={{ backgroundColor: activeZone.color }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-[10px]">0.0</span>
        <span className="text-muted-foreground text-[10px]">0.9</span>
        <span className="text-muted-foreground text-[10px]">1.3</span>
        <span className="text-muted-foreground text-[10px]">1.5</span>
        <span className="text-muted-foreground text-[10px]">2.0</span>
      </div>

      <p className="text-center text-xs font-medium" style={{ color: activeZone.color }}>
        {activeZone.label}
      </p>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

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
        <Link className="text-muted-foreground block text-sm" href="/">
          ← Aujourd'hui
        </Link>
        <p className="text-muted-foreground text-sm">Données de fatigue indisponibles.</p>
      </div>
    );
  }

  const today = new Date();
  const activityInputs = activities.map((a) => ({ load: a.load, date: new Date(a.date) }));
  const trainingLoad = computeTrainingLoad(activityInputs, today);

  // PMC series — last 28 days for chart
  const pmcSeries = computePmcSeries(
    activities.map((a) => ({ ...a, date: new Date(a.date) })),
    28,
    today,
  );

  // Weekly TSS bars — last 8 weeks
  const weeklyTss: { week: string; tss: number }[] = [];
  for (let w = 7; w >= 0; w--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - w * 7 - 6);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() - w * 7);
    const total = activities
      .filter((a) => {
        const d = new Date(a.date);
        return d >= weekStart && d <= weekEnd;
      })
      .reduce((s, a) => s + (a.load ?? 0), 0);
    const label = `S-${w}`;
    weeklyTss.push({ week: w === 0 ? 'Cette sem.' : label, tss: Math.round(total) });
  }
  const avgWeeklyTss =
    weeklyTss.length > 0
      ? Math.round(weeklyTss.reduce((s, w) => s + w.tss, 0) / weeklyTss.length)
      : 0;

  const chronicWeeklyAvg =
    trainingLoad.acwr > 0 ? Math.round(trainingLoad.weeklyLoad / trainingLoad.acwr) : null;

  const signal = mapFatigueToSignal(
    fatigue.fatigueLevel as FatigueLevel,
    fatigue.trajectory as FatigueTrajectory,
  );
  const fatigueTypeLabel = mapFatigueTypeToLabel(fatigue.fatigueType as FatigueType);
  const overreachingDisplay = OVERREACHING_RISK_DISPLAY[fatigue.signals.functionalOverreachingRisk];
  const performancePercent =
    fatigue.performanceImpairmentEstimate > 0
      ? Math.round((1 - fatigue.performanceImpairmentEstimate) * 100)
      : null;

  const verdictDisplay =
    FATIGUE_VERDICT_DISPLAY[fatigue.decision.verdict] ?? FATIGUE_VERDICT_DISPLAY.INSUFFICIENT_DATA;
  const verdictDescription =
    VERDICT_DESCRIPTION[fatigue.decision.verdict] ?? VERDICT_DESCRIPTION.INSUFFICIENT_DATA;

  const confidencePct = Math.round(fatigue.confidence * 100);
  const confidenceTier = mapConfidenceToTier(fatigue.confidence);
  const confidenceDisplay = CONFIDENCE_TIER_LABEL[confidenceTier];
  const completenessLabel =
    COMPLETENESS_LABEL[fatigue.dataCompleteness] ?? fatigue.dataCompleteness;

  const availableDimCount = Object.values(fatigue.dimensions).filter((d) => d.available).length;
  const isLowFatigue =
    fatigue.fatigueLevel === 'FRESH' || fatigue.fatigueLevel === 'FUNCTIONAL_LOW';
  const dominantLabelMap = isLowFatigue ? DOMINANT_LABEL_LOW_FATIGUE : DOMINANT_LABEL;

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
              Charge d'effort
            </p>
            <div className="flex items-center gap-5">
              <ArcGauge score={fatigue.fatigueIndex} size={96} strokeWidth={7} invertColor />
              <div className="space-y-1.5">
                <span
                  className={cn(
                    'flex items-center gap-1 text-sm font-semibold',
                    signal.qualityClass,
                  )}
                >
                  {signal.label}
                  <span aria-hidden>{signal.arrow}</span>
                </span>
                {fatigueTypeLabel && fatigue.fatigueType !== 'UNDETERMINED' && (
                  <p className="text-muted-foreground text-xs">
                    Type : <span className="text-foreground font-medium">{fatigueTypeLabel}</span>
                  </p>
                )}
                {performancePercent !== null && performancePercent < 100 && (
                  <p className="text-muted-foreground text-xs">
                    Capacité :{' '}
                    <span className="text-foreground font-medium">~{performancePercent}%</span>
                  </p>
                )}
                {fatigue.consecutiveAccumulationDays > 0 && (
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                    {fatigue.consecutiveAccumulationDays}j d'accumulation consécutifs
                  </p>
                )}
                {fatigue.estimatedTimeToFresh !== null && fatigue.estimatedTimeToFresh > 0 && (
                  <p className="text-muted-foreground text-xs">
                    Frais dans{' '}
                    <span className="text-foreground font-medium">
                      {fatigue.estimatedTimeToFresh === 1
                        ? '1 jour'
                        : `${fatigue.estimatedTimeToFresh} jours`}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Load directive */}
          <div
            className={cn(
              'rounded-2xl border px-5 py-4',
              verdictDisplay.borderClass,
              verdictDisplay.bgClass,
            )}
          >
            <p className="text-muted-foreground text-[11px] font-medium uppercase">
              Directive de charge
            </p>
            <p className={cn('mt-1 text-sm font-semibold', verdictDisplay.colorClass)}>
              {verdictDisplay.label}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">{verdictDescription}</p>
            {fatigue.decision.rationale.length > 0 && (
              <ul className="mt-2 space-y-1">
                {fatigue.decision.rationale.slice(0, 3).map((r, i) => (
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

          {/* Training capacity */}
          <div className="bg-card/60 rounded-2xl border px-5 py-4">
            <p className="text-muted-foreground text-[11px] font-medium uppercase">
              Capacité d'entraînement
            </p>
            <p className="mt-1 text-sm font-semibold">
              {mapFatigueCapacityLabel(fatigue.trainingCapacity as TrainingCapacity)}
            </p>
          </div>

          {/* ACWR zone gauge */}
          {trainingLoad.acwr > 0 && (
            <div className="bg-card/60 rounded-2xl border px-5 py-4">
              <p className="text-muted-foreground mb-6 text-[11px] font-medium uppercase">
                ACWR — Ratio charge aiguë / chronique
              </p>
              <AcwrZoneBar acwr={trainingLoad.acwr} />
              <p className="text-muted-foreground/50 mt-2 text-[10px]">
                Source: Gabbett 2016 · Sweet spot 0.9–1.3
              </p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground text-[10px]">Charge 7j (aiguë)</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {trainingLoad.weeklyLoad > 0 ? `${trainingLoad.weeklyLoad} TSS` : '—'}
                  </p>
                </div>
                {chronicWeeklyAvg !== null && (
                  <div>
                    <p className="text-muted-foreground text-[10px]">Base 42j (chronique)</p>
                    <p className="text-sm font-semibold tabular-nums">{chronicWeeklyAvg} TSS/sem</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5 Dimension bars */}
          <div className="bg-card/60 space-y-3 rounded-2xl border px-5 py-4">
            <p className="text-muted-foreground text-[11px] font-medium uppercase">
              Détail par dimension
            </p>
            <div className="space-y-3">
              {Object.entries(fatigue.dimensions).map(([key, dim]) => (
                <DimensionRow key={key} dim={dim} name={key} />
              ))}
            </div>
            {availableDimCount < 5 && (
              <p className="text-muted-foreground/50 text-[10px]">
                {5 - availableDimCount} dimension{5 - availableDimCount > 1 ? 's' : ''} manquante
                {5 - availableDimCount > 1 ? 's' : ''} (pas de données subjectives).
              </p>
            )}
          </div>

          {/* Dominant dimension callout */}
          {fatigue.dominantDimension && (
            <div
              className={cn(
                'rounded-2xl border px-5 py-4',
                isLowFatigue ? 'bg-card/60' : 'border-amber-500/30 bg-amber-500/8',
              )}
            >
              <p
                className={cn(
                  'text-[11px] font-medium uppercase',
                  isLowFatigue ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400',
                )}
              >
                {isLowFatigue ? 'Dimension la plus contributive' : 'Dimension dominante'}
              </p>
              <p className="mt-1 text-sm font-semibold">
                {dominantLabelMap[fatigue.dominantDimension] ?? fatigue.dominantDimension}
              </p>
              {fatigue.primaryLimitingFactor && (
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {resolveCode(fatigue.primaryLimitingFactor)}
                </p>
              )}
            </div>
          )}

          {/* Key evidence */}
          {fatigue.recommendation.keyEvidence.length > 0 && (
            <div className="bg-card/40 space-y-2 rounded-2xl border px-5 py-4">
              <p className="text-muted-foreground text-[11px] font-medium uppercase">
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

          {/* Overreaching alert */}
          {overreachingDisplay && (
            <div className="space-y-1 rounded-2xl border border-orange-500/20 bg-orange-500/5 px-5 py-4">
              <p className="text-[11px] font-medium text-orange-600 uppercase dark:text-orange-400">
                Alerte
              </p>
              <p className={cn('text-xs font-medium', overreachingDisplay.colorClass)}>
                ⚠ Surmenage fonctionnel — {overreachingDisplay.label}
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN ────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* PMC chart — CTL / ATL / TSB */}
          {pmcSeries.length > 0 && (
            <div className="bg-card/60 rounded-2xl border px-4 py-4">
              <p className="text-muted-foreground mb-2 text-[11px] font-medium uppercase">
                PMC — 28 jours
              </p>
              <ResponsiveContainer height={120} width="100%">
                <LineChart data={pmcSeries} margin={{ top: 4, right: 4, bottom: 2, left: 2 }}>
                  <XAxis
                    axisLine={false}
                    dataKey="label"
                    interval="preserveStartEnd"
                    tick={{ fontSize: 8, fill: 'currentColor' }}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} vertical={false} />
                  <ReferenceLine stroke="currentColor" strokeOpacity={0.2} y={0} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const pt = payload[0]?.payload as {
                        label: string;
                        ctl: number;
                        atl: number;
                        tsb: number;
                      };
                      return (
                        <div className="bg-popover border-border rounded-lg border px-2 py-1 text-[10px] shadow-sm">
                          <p className="font-medium">{pt.label}</p>
                          <p className="text-blue-500">CTL {pt.ctl}</p>
                          <p className="text-orange-500">ATL {pt.atl}</p>
                          <p className={pt.tsb >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                            TSB {pt.tsb > 0 ? '+' : ''}
                            {pt.tsb}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Line
                    dataKey="ctl"
                    dot={false}
                    name="CTL"
                    stroke="#3b82f6"
                    strokeWidth={1.5}
                    type="monotone"
                  />
                  <Line
                    dataKey="atl"
                    dot={false}
                    name="ATL"
                    stroke="#f97316"
                    strokeWidth={1.5}
                    type="monotone"
                  />
                  <Line
                    dataKey="tsb"
                    dot={false}
                    name="TSB"
                    stroke="#10b981"
                    strokeDasharray="3 2"
                    strokeWidth={1}
                    type="monotone"
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 9 }} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-muted-foreground/50 mt-1 text-[10px]">
                CTL = forme · ATL = fatigue · TSB = forme − fatigue
              </p>
            </div>
          )}

          {/* Weekly TSS bars */}
          {weeklyTss.some((w) => w.tss > 0) && (
            <div className="bg-card/60 rounded-2xl border px-4 py-4">
              <p className="text-muted-foreground mb-2 text-[11px] font-medium uppercase">
                TSS hebdomadaire — 8 semaines
              </p>
              <ResponsiveContainer height={90} width="100%">
                <BarChart data={weeklyTss} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
                  <XAxis
                    axisLine={false}
                    dataKey="week"
                    tick={{ fontSize: 8, fill: 'currentColor' }}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} vertical={false} />
                  {avgWeeklyTss > 0 && (
                    <ReferenceLine
                      stroke="#94a3b8"
                      strokeDasharray="4 2"
                      strokeOpacity={0.5}
                      y={avgWeeklyTss}
                    />
                  )}
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null;
                      const pt = payload[0].payload as { week: string; tss: number };
                      return (
                        <div className="bg-popover border-border rounded-lg border px-2 py-1 text-[10px] shadow-sm">
                          <p className="font-medium">{pt.tss} TSS</p>
                          <p className="text-muted-foreground">{pt.week}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="tss" fill="#3b82f6" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              {avgWeeklyTss > 0 && (
                <p className="text-muted-foreground/50 mt-1 text-[10px]">
                  Moy. {avgWeeklyTss} TSS/sem (ligne pointillée)
                </p>
              )}
            </div>
          )}

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
                <p className="text-muted-foreground text-[10px]">Dims actives</p>
                <p className="text-sm font-bold tabular-nums">{availableDimCount} / 5</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px]">Données</p>
                <p className="text-sm font-bold">{completenessLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

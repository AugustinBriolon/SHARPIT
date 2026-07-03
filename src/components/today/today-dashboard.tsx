'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format, subDays, isSameDay, isAfter, formatDistanceToNowStrict } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart, Line, XAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

import { useToday } from '@/hooks/use-today';
import { useHealthEntries, useActivities, usePlannedSessions } from '@/hooks/use-data';
import { computeTrainingLoad } from '@/lib/training-load';
import {
  mapScoreToColorClass,
  mapRecoveryToSignal,
  mapFatigueToSignal,
  mapConfidenceToTier,
  mapConsistencyToDisplay,
  type ReadinessCategory,
  type FatigueLevel,
  type FatigueTrajectory,
  type PhysiologicalConsistency,
} from '@/lib/today-mapping';
import { NarrativeHeader } from './narrative-header';
import { SessionBlock } from './session-block';
import type { ClientHealthEntry, ClientPlannedSession } from '@/lib/query/types';
import type { AdaptationDecisionVerdict } from '@/hooks/use-today';

// ─────────────────────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatSleep(minutes: number | null): string {
  if (minutes === null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

const ACTIVITY_LABEL: Record<string, string> = {
  RUN: 'Course',
  BIKE: 'Vélo',
  SWIM: 'Natation',
  STRENGTH: 'Muscu',
};

const INTENSITY_LABEL: Record<string, string> = {
  RECOVERY: 'Récupération',
  ENDURANCE: 'Endurance',
  TEMPO: 'Tempo',
  THRESHOLD: 'Seuil',
  VO2MAX: 'VO2 Max',
  RACE: 'Compétition',
};

// ─────────────────────────────────────────────────────────────────────────────
// Sparkline — responsive SVG with area fill
// ─────────────────────────────────────────────────────────────────────────────

function buildSparkPaths(
  values: (number | null)[],
  W: number,
  H: number,
): { line: string; area: string } {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length < 2) return { line: '', area: '' };

  const minV = Math.min(...valid);
  const maxV = Math.max(...valid);
  const range = maxV - minV || 1;
  const pad = 2;

  const sx = (i: number) => pad + (i / (values.length - 1)) * (W - pad * 2);
  const sy = (v: number) => H - pad - ((v - minV) / range) * (H - pad * 2);

  let line = '';
  let area = '';
  let lastX = 0;
  let started = false;

  values.forEach((v, i) => {
    if (v === null) {
      started = false;
      return;
    }
    const x = sx(i);
    const y = sy(v);
    if (!started) {
      line += `M ${x} ${y}`;
      area += `M ${x} ${H} L ${x} ${y}`;
      started = true;
    } else {
      line += ` L ${x} ${y}`;
      area += ` L ${x} ${y}`;
    }
    lastX = x;
  });

  if (area) area += ` L ${lastX} ${H} Z`;
  return { line, area };
}

function Sparkline({
  values,
  stroke,
  h = 32,
}: {
  values: (number | null)[];
  stroke: string;
  h?: number;
}) {
  const W = 200;
  const { line, area } = buildSparkPaths(values, W, h);
  const gid = `sg${stroke.replace('#', '')}`;
  if (!line) return null;

  return (
    <svg height={h} preserveAspectRatio="none" viewBox={`0 0 ${W} ${h}`} width="100%" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {area && <path d={area} fill={`url(#${gid})`} />}
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DeltaBadge
// ─────────────────────────────────────────────────────────────────────────────

function DeltaBadge({
  delta,
  higherIsBetter = true,
}: {
  delta: number | null;
  higherIsBetter?: boolean;
}) {
  if (delta === null || delta === 0) return null;
  const good = higherIsBetter ? delta > 0 : delta < 0;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
        good
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
          : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400',
      )}
    >
      {delta > 0 ? '+' : ''}
      {delta}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScoreCard — Row 1 colored tile with sparkline + sub-metrics
// ─────────────────────────────────────────────────────────────────────────────

interface ScoreCardProps {
  href: string;
  label: string;
  score: number | null;
  delta: number | null;
  higherIsBetter?: boolean;
  trendLabel: string;
  trendArrow: string;
  trendClass: string;
  sparklineValues: (number | null)[];
  sparklineStroke: string;
  accentClass: string;
  cardClass: string;
  subMetrics: { label: string; value: string }[];
}

function ScoreCard({
  href,
  label,
  score,
  delta,
  higherIsBetter = true,
  trendLabel,
  trendArrow,
  trendClass,
  sparklineValues,
  sparklineStroke,
  accentClass,
  cardClass,
  subMetrics,
}: ScoreCardProps) {
  const scoreClass = mapScoreToColorClass(score);

  return (
    <Link
      href={href}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border transition-opacity hover:opacity-90',
        cardClass,
      )}
    >
      <span className={cn('absolute inset-x-0 top-0 h-[3px]', accentClass)} aria-hidden />

      <div className="flex flex-col gap-3 px-5 pt-6 pb-4">
        <p className="text-[10px] font-semibold tracking-[0.15em] text-slate-500 uppercase dark:text-slate-400">
          {label}
        </p>

        <div className="flex items-end gap-2">
          <span className={cn('text-5xl leading-none font-bold tabular-nums', scoreClass)}>
            {score !== null ? score : '—'}
          </span>
          <div className="mb-1 flex flex-col gap-1">
            <DeltaBadge delta={delta} higherIsBetter={higherIsBetter} />
            <span className={cn('flex items-center gap-0.5 text-xs font-medium', trendClass)}>
              {trendLabel}
              <span className="text-[10px]" aria-hidden>
                {trendArrow}
              </span>
            </span>
          </div>
        </div>

        {subMetrics.length > 0 && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-current/10 pt-3">
            {subMetrics.map((m) => (
              <div key={m.label}>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">{m.label}</p>
                <p className="text-xs font-semibold text-slate-700 tabular-nums dark:text-slate-200">
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-auto px-1 pb-1">
        <Sparkline h={36} stroke={sparklineStroke} values={sparklineValues} />
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ArcGauge — SVG 270° arc
// ─────────────────────────────────────────────────────────────────────────────

function ArcGauge({
  score,
  label,
  href,
  size = 72,
}: {
  score: number | null;
  label: string;
  href?: string;
  size?: number;
}) {
  const pct = score ?? 0;
  const r = size * 0.35;
  const circ = 2 * Math.PI * r;
  const arcFraction = 0.75;
  const arcLen = circ * arcFraction;
  const filled = arcLen * (pct / 100);
  const gap = arcLen - filled;

  const strokeColor = (() => {
    if (score === null) return '#94a3b8';
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  })();

  const cx = size / 2;
  const cy = size / 2;
  const colorClass = mapScoreToColorClass(score);

  const content = (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg height={size} viewBox={`0 0 ${size} ${size}`} width={size} aria-hidden>
          <circle
            cx={cx}
            cy={cy}
            fill="none"
            r={r}
            stroke="currentColor"
            strokeDasharray={`${arcLen} ${circ - arcLen}`}
            strokeLinecap="round"
            strokeOpacity={0.1}
            strokeWidth={5}
            transform={`rotate(135 ${cx} ${cy})`}
          />
          <circle
            cx={cx}
            cy={cy}
            fill="none"
            r={r}
            stroke={strokeColor}
            strokeDasharray={`${filled} ${gap + (circ - arcLen)}`}
            strokeLinecap="round"
            strokeWidth={5}
            transform={`rotate(135 ${cx} ${cy})`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('text-sm leading-none font-bold tabular-nums', colorClass)}>
            {score !== null ? score : '—'}
          </span>
        </div>
      </div>
      <span className="text-center text-[10px] font-medium text-slate-500 dark:text-slate-400">
        {label}
      </span>
    </div>
  );

  if (href) {
    return (
      <Link className="transition-opacity hover:opacity-80" href={href}>
        {content}
      </Link>
    );
  }
  return content;
}

function PhysioGaugePanel({
  recoveryScore,
  fatigueIndex,
  adaptationIndex,
}: {
  recoveryScore: number | null;
  fatigueIndex: number | null;
  adaptationIndex: number | null;
}) {
  const capacityScore = fatigueIndex !== null ? 100 - fatigueIndex : null;

  return (
    <div className="bg-card flex flex-col rounded-2xl border px-5 py-5">
      <p className="mb-4 text-[10px] font-semibold tracking-[0.15em] text-slate-500 uppercase dark:text-slate-400">
        Signaux physiologiques
      </p>
      <div className="flex flex-1 items-center justify-around gap-2">
        <ArcGauge href="/today/recovery" label="Récupération" score={recoveryScore} size={76} />
        <ArcGauge href="/today/effort" label="Capacité" score={capacityScore} size={76} />
        <ArcGauge label="Adaptation" score={adaptationIndex} size={76} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HealthMonitorPanel — metrics with mini sparklines
// ─────────────────────────────────────────────────────────────────────────────

function HealthMonitorPanel({
  entry,
  entries,
}: {
  entry: ClientHealthEntry | null;
  entries: ClientHealthEntry[];
}) {
  const today = new Date();
  const last7 = Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));

  const numSeries = (key: keyof ClientHealthEntry) =>
    last7.map((d) => {
      const e = entries.find((en) => isSameDay(new Date(en.date), d));
      if (!e) return null;
      const v = e[key];
      return typeof v === 'number' ? v : null;
    });

  const metrics: { label: string; value: string; data: (number | null)[]; stroke: string }[] = [
    {
      label: 'FC repos',
      value: entry?.restingHr != null ? `${entry.restingHr} bpm` : '—',
      data: numSeries('restingHr'),
      stroke: '#64748b',
    },
    {
      label: 'VFC',
      value: entry?.hrv != null ? `${entry.hrv} ms` : '—',
      data: numSeries('hrv'),
      stroke: '#10b981',
    },
    {
      label: 'Body Battery',
      value: entry?.bodyBattery != null ? `${entry.bodyBattery}` : '—',
      data: numSeries('bodyBattery'),
      stroke: '#8b5cf6',
    },
    {
      label: 'Stress',
      value: entry?.stress != null ? String(entry.stress) : '—',
      data: numSeries('stress'),
      stroke: '#f59e0b',
    },
    {
      label: 'Poids',
      value: entry?.weightKg != null ? `${entry.weightKg.toFixed(1)} kg` : '—',
      data: numSeries('weightKg'),
      stroke: '#3b82f6',
    },
    {
      label: 'Respiration',
      value: entry?.sleepRespiration != null ? `${entry.sleepRespiration.toFixed(1)} r/m` : '—',
      data: numSeries('sleepRespiration'),
      stroke: '#06b6d4',
    },
  ];

  const visible = metrics.filter((m) => m.value !== '—' || m.data.some((v) => v !== null));

  return (
    <div className="bg-card flex flex-col rounded-2xl border px-5 py-5">
      <p className="mb-4 text-[10px] font-semibold tracking-[0.15em] text-slate-500 uppercase dark:text-slate-400">
        Moniteur de santé
      </p>
      <div className="space-y-3">
        {visible.map((m) => (
          <div key={m.label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs text-slate-500 dark:text-slate-400">
              {m.label}
            </span>
            <div className="min-w-0 flex-1">
              <div className="h-5">
                <Sparkline h={20} stroke={m.stroke} values={m.data} />
              </div>
            </div>
            <span className="w-20 shrink-0 text-right text-xs font-semibold text-slate-700 tabular-nums dark:text-slate-200">
              {m.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EvolutionChart — 7-day recovery + sleep trend
// ─────────────────────────────────────────────────────────────────────────────

function EvolutionChart({ entries }: { entries: ClientHealthEntry[] }) {
  const today = new Date();
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(today, 6 - i);
    const e = entries.find((en) => isSameDay(new Date(en.date), d));
    return {
      day: format(d, 'EEE', { locale: fr }),
      recovery: e?.recoveryScore ?? null,
      sleep: e?.sleepScore ?? null,
    };
  });

  const hasData = chartData.some((p) => p.recovery !== null || p.sleep !== null);

  return (
    <div className="bg-card flex flex-col rounded-2xl border px-5 py-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-[10px] font-semibold tracking-[0.15em] text-slate-500 uppercase dark:text-slate-400">
          Évolution 7 jours
        </p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
            <span className="inline-block h-1.5 w-3 rounded-full bg-emerald-500" />
            Récup
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-blue-600 dark:text-blue-400">
            <span className="inline-block h-1.5 w-3 rounded-full bg-blue-500" />
            Sommeil
          </span>
        </div>
      </div>
      {hasData ? (
        <ResponsiveContainer height={140} width="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <CartesianGrid stroke="currentColor" strokeDasharray="3 3" strokeOpacity={0.07} />
            <XAxis
              axisLine={false}
              dataKey="day"
              tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.45 }}
              tickLine={false}
            />
            <Tooltip
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => (v != null ? v : '—') as any}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
                fontSize: '11px',
              }}
            />
            <Line
              activeDot={{ r: 3 }}
              dataKey="recovery"
              dot={false}
              name="Récup"
              stroke="#10b981"
              strokeWidth={2}
              type="monotone"
              connectNulls
            />
            <Line
              activeDot={{ r: 3 }}
              dataKey="sleep"
              dot={false}
              name="Sommeil"
              stroke="#3b82f6"
              strokeWidth={2}
              type="monotone"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[140px] items-center justify-center">
          <p className="text-xs text-slate-400">Pas encore de données sur 7 jours</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ConfidencePanel — ring gauge
// ─────────────────────────────────────────────────────────────────────────────

function ConfidencePanel({
  confidence,
  availableModelCount,
  physiologicalConsistency,
  consistencyScore,
}: {
  confidence: number;
  availableModelCount: number;
  physiologicalConsistency: PhysiologicalConsistency;
  consistencyScore: number;
}) {
  const pct = Math.round(confidence * 100);
  const tier = mapConfidenceToTier(confidence);
  const consistencyDisplay = mapConsistencyToDisplay(physiologicalConsistency, consistencyScore);

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

  return (
    <div className="bg-card flex flex-col rounded-2xl border px-5 py-5">
      <p className="mb-4 text-[10px] font-semibold tracking-[0.15em] text-slate-500 uppercase dark:text-slate-400">
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
              {availableModelCount}
            </span>
          </div>
          <p className={cn('text-[10px] leading-snug', consistencyDisplay.colorClass)}>
            {consistencyDisplay.label}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PlanningRow — upcoming planned sessions
// ─────────────────────────────────────────────────────────────────────────────

const ACTIVITY_COLOR: Record<string, string> = {
  RUN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
  BIKE: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
  SWIM: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400',
  STRENGTH: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400',
};

function PlanningRow({ sessions }: { sessions: ClientPlannedSession[] }) {
  const today = new Date();
  const upcoming = sessions
    .filter((s) => !s.completed && isAfter(new Date(s.date), today))
    .slice(0, 4);

  if (upcoming.length === 0) return null;

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold tracking-[0.15em] text-slate-500 uppercase dark:text-slate-400">
        Prochaines séances
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {upcoming.map((s) => {
          const typeLabel = ACTIVITY_LABEL[s.type as string] ?? s.type;
          const typeColor =
            ACTIVITY_COLOR[s.type as string] ?? 'bg-slate-100 text-slate-600 dark:bg-slate-800';
          const intensityLabel = s.intensity
            ? (INTENSITY_LABEL[s.intensity as string] ?? s.intensity)
            : null;
          const dateStr = formatDistanceToNowStrict(new Date(s.date), {
            locale: fr,
            addSuffix: true,
          });

          return (
            <Link
              key={s.id}
              className="bg-card hover:bg-muted/30 flex flex-col gap-2 rounded-xl border p-4 transition-colors"
              href="/planning"
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase',
                    typeColor,
                  )}
                >
                  {typeLabel}
                </span>
                {s.durationMin && (
                  <span className="text-[10px] font-medium text-slate-400">
                    {s.durationMin} min
                  </span>
                )}
              </div>
              <p className="line-clamp-1 text-xs leading-snug font-semibold text-slate-700 dark:text-slate-200">
                {s.title ?? typeLabel}
              </p>
              <p className="text-[10px] text-slate-400">{dateStr}</p>
              {intensityLabel && (
                <p className="text-[10px] font-medium text-slate-500">{intensityLabel}</p>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardSkeleton
// ─────────────────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-muted h-44 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="bg-muted h-56 rounded-2xl" />
        <div className="bg-muted h-56 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr_1fr]">
        <div className="bg-muted h-48 rounded-2xl" />
        <div className="bg-muted h-48 rounded-2xl" />
        <div className="bg-muted h-48 rounded-2xl" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InsufficientDataState
// ─────────────────────────────────────────────────────────────────────────────

function InsufficientDataState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="max-w-xs text-sm text-slate-500">
        Pas encore de données physiologiques pour aujourd&apos;hui. Synchronise tes appareils pour
        obtenir ton bilan.
      </p>
      <button
        className="text-xs text-slate-400 underline-offset-4 transition-colors hover:text-slate-600 hover:underline"
        onClick={onRetry}
      >
        Réessayer
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TodayDashboard
// ─────────────────────────────────────────────────────────────────────────────

export function TodayDashboard() {
  const { data, loading, refresh } = useToday();
  const { reasoning, recovery, fatigue, adaptation } = data;

  const { data: healthEntries = [] } = useHealthEntries(14);
  const { data: activities = [] } = useActivities();
  const { data: plannedSessions = [] } = usePlannedSessions();

  if (loading) return <DashboardSkeleton />;

  if (!reasoning || reasoning.overallVerdict === 'INSUFFICIENT_DATA') {
    return <InsufficientDataState onRetry={refresh} />;
  }

  const { topAction } = reasoning;
  if (!topAction) return <InsufficientDataState onRetry={refresh} />;

  const today = new Date();
  const todayEntry = healthEntries.find((e) => isSameDay(new Date(e.date), today)) ?? null;
  const yesterdayEntry =
    healthEntries.find((e) => isSameDay(new Date(e.date), subDays(today, 1))) ?? null;

  // Sparklines (14-day arrays)
  const recoverySpark = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(today, 13 - i);
    return healthEntries.find((e) => isSameDay(new Date(e.date), d))?.recoveryScore ?? null;
  });
  const sleepSpark = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(today, 13 - i);
    return healthEntries.find((e) => isSameDay(new Date(e.date), d))?.sleepScore ?? null;
  });
  const effortSpark = Array.from({ length: 14 }, (_, i) => {
    const d = subDays(today, 13 - i);
    const load = activities
      .filter((a) => isSameDay(new Date(a.date), d))
      .reduce((sum, a) => sum + (a.load ?? 0), 0);
    return load > 0 ? load : null;
  });

  // Deltas (today vs yesterday raw Garmin scores)
  const recoveryDelta =
    todayEntry?.recoveryScore != null && yesterdayEntry?.recoveryScore != null
      ? todayEntry.recoveryScore - yesterdayEntry.recoveryScore
      : null;
  const sleepDelta =
    todayEntry?.sleepScore != null && yesterdayEntry?.sleepScore != null
      ? todayEntry.sleepScore - yesterdayEntry.sleepScore
      : null;

  // Training load sub-metrics
  const trainingLoad = computeTrainingLoad(
    activities.map((a) => ({ load: a.load, date: new Date(a.date) })),
    today,
  );

  // Signals
  const recoverySignal = mapRecoveryToSignal(
    (recovery?.readinessCategory as ReadinessCategory) ?? 'INSUFFICIENT_DATA',
  );
  const fatigueSignal = mapFatigueToSignal(
    (fatigue?.fatigueLevel as FatigueLevel) ?? 'INSUFFICIENT_DATA',
    (fatigue?.trajectory as FatigueTrajectory) ?? 'STABLE',
  );

  const sleepAdequacy = recovery?.signals.sleepAdequacy ?? 'ADEQUATE';
  const SLEEP_TREND: Record<string, { label: string; arrow: string; colorClass: string }> = {
    EXCELLENT: {
      label: 'Excellent',
      arrow: '↗',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
    },
    ADEQUATE: { label: 'Correct', arrow: '→', colorClass: 'text-blue-600 dark:text-blue-400' },
    INSUFFICIENT: {
      label: 'Insuffisant',
      arrow: '↘',
      colorClass: 'text-amber-600 dark:text-amber-400',
    },
    SEVERELY_INSUFFICIENT: {
      label: 'Très insuffisant',
      arrow: '↓',
      colorClass: 'text-red-600 dark:text-red-400',
    },
  };
  const sleepSignal = SLEEP_TREND[sleepAdequacy] ?? {
    label: '—',
    arrow: '→',
    colorClass: 'text-slate-400',
  };

  // Sleep score (from inference engine dimension)
  const sleepScore = recovery?.dimensions.sleep.available
    ? (recovery.dimensions.sleep.score ?? null)
    : null;

  return (
    <div className="space-y-4">
      {/* Row 1: Score cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ScoreCard
          accentClass="bg-emerald-500"
          cardClass="bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40"
          delta={recoveryDelta}
          href="/today/recovery"
          label="Récupération"
          score={recovery?.readinessScore ?? null}
          sparklineStroke="#10b981"
          sparklineValues={recoverySpark}
          trendArrow={recoverySignal.arrow}
          trendClass={recoverySignal.qualityClass}
          trendLabel={recoverySignal.label}
          subMetrics={[
            {
              label: 'VFC',
              value: todayEntry?.hrv != null ? `${todayEntry.hrv} ms` : '—',
            },
            {
              label: 'FC repos',
              value: todayEntry?.restingHr != null ? `${todayEntry.restingHr} bpm` : '—',
            },
          ]}
          higherIsBetter
        />
        <ScoreCard
          accentClass="bg-amber-500"
          cardClass="bg-amber-50/80 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40"
          delta={null}
          higherIsBetter={false}
          href="/today/effort"
          label="Charge d'effort"
          score={fatigue?.fatigueIndex ?? null}
          sparklineStroke="#f59e0b"
          sparklineValues={effortSpark}
          trendArrow={fatigueSignal.arrow}
          trendClass={fatigueSignal.qualityClass}
          trendLabel={fatigueSignal.label}
          subMetrics={[
            {
              label: 'TSS sem.',
              value: trainingLoad.weeklyLoad > 0 ? String(trainingLoad.weeklyLoad) : '—',
            },
            {
              label: 'ACWR',
              value: trainingLoad.acwr > 0 ? String(trainingLoad.acwr) : '—',
            },
          ]}
        />
        <ScoreCard
          accentClass="bg-blue-500"
          cardClass="bg-blue-50/80 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/40"
          delta={sleepDelta}
          href="/today/sleep"
          label="Sommeil"
          score={sleepScore}
          sparklineStroke="#3b82f6"
          sparklineValues={sleepSpark}
          trendArrow={sleepSignal.arrow}
          trendClass={sleepSignal.colorClass}
          trendLabel={sleepSignal.label}
          subMetrics={[
            {
              label: 'Durée',
              value: formatSleep(todayEntry?.sleepMinutes ?? null),
            },
            {
              label: 'Profond',
              value: formatSleep(todayEntry?.sleepDeepMin ?? null),
            },
          ]}
          higherIsBetter
        />
      </div>

      {/* Row 2: Decision + Health monitor */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-3">
          <NarrativeHeader
            computedAt={reasoning.computedAt}
            confidence={reasoning.confidence}
            topAction={topAction}
            verdict={reasoning.overallVerdict}
          />
          <SessionBlock
            adaptationVerdict={(adaptation?.decision.verdict as AdaptationDecisionVerdict) ?? null}
            recommendation={fatigue?.recommendation ?? null}
            topAction={topAction}
          />
        </div>
        <HealthMonitorPanel entries={healthEntries} entry={todayEntry} />
      </div>

      {/* Row 3: Physio gauges + Evolution chart + Confidence */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr_1fr]">
        <PhysioGaugePanel
          adaptationIndex={adaptation?.adaptationIndex ?? null}
          fatigueIndex={fatigue?.fatigueIndex ?? null}
          recoveryScore={recovery?.readinessScore ?? null}
        />
        <EvolutionChart entries={healthEntries} />
        <ConfidencePanel
          availableModelCount={reasoning.signals.availableModelCount}
          confidence={reasoning.confidence}
          consistencyScore={reasoning.consistencyScore}
          physiologicalConsistency={reasoning.physiologicalConsistency as PhysiologicalConsistency}
        />
      </div>

      {/* Row 4: Planning */}
      <PlanningRow sessions={plannedSessions} />
    </div>
  );
}

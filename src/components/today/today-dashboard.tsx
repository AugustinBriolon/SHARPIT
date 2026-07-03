'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format, subDays, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LineChart, Line, XAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';

import { useToday } from '@/hooks/use-today';
import { useHealthEntries, useActivities } from '@/hooks/use-data';
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
import type { ClientHealthEntry } from '@/lib/query/types';
import type { AdaptationDecisionVerdict } from '@/hooks/use-today';

// ─────────────────────────────────────────────────────────────────────────────
// ScoreDashCard
// ─────────────────────────────────────────────────────────────────────────────

interface SubMetric {
  label: string;
  value: string;
}

function ScoreDashCard({
  href,
  label,
  score,
  trendLabel,
  trendArrow,
  trendClass,
  subMetrics,
}: {
  href: string;
  label: string;
  score: number | null;
  trendLabel: string;
  trendArrow: string;
  trendClass: string;
  subMetrics: SubMetric[];
}) {
  const scoreClass = mapScoreToColorClass(score);
  return (
    <Link
      className="bg-card hover:bg-card/80 flex flex-col gap-3 rounded-2xl border px-5 py-5 transition-colors"
      href={href}
    >
      <p className="text-muted-foreground text-[10px] font-medium tracking-[0.12em] uppercase">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className={cn('text-4xl leading-none font-bold tabular-nums', scoreClass)}>
          {score !== null ? score : '—'}
        </span>
        <span className={cn('flex items-center gap-1 text-xs font-medium', trendClass)}>
          {trendLabel}
          <span className="text-[10px]" aria-hidden>
            {trendArrow}
          </span>
        </span>
      </div>
      {subMetrics.length > 0 && (
        <div className="space-y-1.5 border-t pt-3">
          {subMetrics.map((m) => (
            <div key={m.label} className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px]">{m.label}</span>
              <span className="text-foreground text-[11px] font-semibold tabular-nums">
                {m.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HealthMetricsPanel
// ─────────────────────────────────────────────────────────────────────────────

function formatSleep(minutes: number | null): string {
  if (minutes === null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

function HealthMetricsPanel({ entry }: { entry: ClientHealthEntry | null }) {
  const rows: { label: string; value: string }[] = [
    {
      label: 'FC repos',
      value: entry?.restingHr != null ? `${entry.restingHr} bpm` : '—',
    },
    {
      label: 'VFC',
      value: entry?.hrv != null ? `${entry.hrv} ms` : '—',
    },
    {
      label: 'Poids',
      value: entry?.weightKg != null ? `${entry.weightKg.toFixed(1)} kg` : '—',
    },
    {
      label: 'Sommeil',
      value: formatSleep(entry?.sleepMinutes ?? null),
    },
    {
      label: 'Stress',
      value: entry?.stress != null ? String(entry.stress) : '—',
    },
  ];

  return (
    <div className="bg-card space-y-4 rounded-2xl border px-5 py-5">
      <p className="text-muted-foreground text-[10px] font-medium tracking-[0.12em] uppercase">
        Moniteur de santé
      </p>
      <div className="space-y-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between">
            <span className="text-muted-foreground text-xs">{row.label}</span>
            <span className="text-foreground text-xs font-semibold tabular-nums">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PhysioSignalsPanel — SVG arc gauges
// ─────────────────────────────────────────────────────────────────────────────

function ArcGauge({ score, label, href }: { score: number | null; label: string; href: string }) {
  const pct = score ?? 0;
  const colorClass = mapScoreToColorClass(score);

  // SVG arc: full circle circumference = 2π × r = 2π × 28 ≈ 175.9
  // We use a 270° arc (¾ circle), starting from bottom-left.
  const r = 28;
  const circ = 2 * Math.PI * r;
  const arcFraction = 0.75; // 270°
  const arcLen = circ * arcFraction;
  const filled = arcLen * (pct / 100);
  const gap = arcLen - filled;

  // Tailwind color → hex for SVG stroke (must be inline, Tailwind can't generate dynamic SVG values)
  const strokeColor = (() => {
    if (score === null) return 'currentColor';
    if (score >= 80) return '#10b981'; // emerald-500
    if (score >= 60) return '#3b82f6'; // blue-500
    if (score >= 40) return '#f59e0b'; // amber-500
    return '#ef4444'; // red-500
  })();

  const rotation = 135; // start at bottom-left

  return (
    <Link className="group flex flex-col items-center gap-2" href={href}>
      <div className="relative">
        <svg height="80" viewBox="0 0 80 80" width="80">
          {/* Track */}
          <circle
            cx="40"
            cy="40"
            fill="none"
            r={r}
            stroke="currentColor"
            strokeDasharray={`${arcLen} ${circ - arcLen}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            strokeOpacity={0.1}
            strokeWidth={6}
            transform={`rotate(${rotation} 40 40)`}
          />
          {/* Value arc */}
          <circle
            cx="40"
            cy="40"
            fill="none"
            r={r}
            stroke={strokeColor}
            strokeDasharray={`${filled} ${gap + (circ - arcLen)}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            strokeWidth={6}
            transform={`rotate(${rotation} 40 40)`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('text-lg leading-none font-bold tabular-nums', colorClass)}>
            {score !== null ? score : '—'}
          </span>
        </div>
      </div>
      <span className="text-muted-foreground group-hover:text-foreground text-center text-[11px] font-medium transition-colors">
        {label}
      </span>
    </Link>
  );
}

function PhysioSignalsPanel({
  recoveryScore,
  fatigueIndex,
}: {
  recoveryScore: number | null;
  fatigueIndex: number | null;
}) {
  // Effort gauge shows inverted fatigue (100 - fatigueIndex = freshness/capacity)
  const effortDisplay = fatigueIndex !== null ? 100 - fatigueIndex : null;

  return (
    <div className="bg-card space-y-4 rounded-2xl border px-5 py-5">
      <p className="text-muted-foreground text-[10px] font-medium tracking-[0.12em] uppercase">
        Signaux physiologiques
      </p>
      <div className="flex items-center justify-around gap-4">
        <ArcGauge href="/today/recovery" label="Récupération" score={recoveryScore} />
        <ArcGauge href="/today/effort" label="Capacité" score={effortDisplay} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WeeklyTrendChart
// ─────────────────────────────────────────────────────────────────────────────

interface TrendPoint {
  day: string;
  recovery: number | null;
  sleep: number | null;
}

function WeeklyTrendChart({ entries }: { entries: ClientHealthEntry[] }) {
  const today = new Date();
  const last7: TrendPoint[] = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(today, 6 - i);
    const entry = entries.find((e) => isSameDay(new Date(e.date), d));
    return {
      day: format(d, 'EEE', { locale: fr }),
      recovery: entry?.recoveryScore ?? null,
      sleep: entry?.sleepScore ?? null,
    };
  });

  const hasData = last7.some((p) => p.recovery !== null || p.sleep !== null);

  return (
    <div className="bg-card space-y-4 rounded-2xl border px-5 py-5">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-[10px] font-medium tracking-[0.12em] uppercase">
          Évolution 7 jours
        </p>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[10px] text-emerald-600">
            <span className="inline-block h-1.5 w-3 rounded-full bg-emerald-500" />
            Récup
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-blue-600">
            <span className="inline-block h-1.5 w-3 rounded-full bg-blue-500" />
            Sommeil
          </span>
        </div>
      </div>
      {hasData ? (
        <ResponsiveContainer height={140} width="100%">
          <LineChart data={last7} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="currentColor" strokeDasharray="3 3" strokeOpacity={0.07} />
            <XAxis
              axisLine={false}
              dataKey="day"
              tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.5 }}
              tickLine={false}
            />
            <Tooltip
              itemStyle={{ color: 'hsl(var(--foreground))' }}
              contentStyle={{
                background: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
                fontSize: '11px',
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => (v != null ? v : '—') as any}
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
          <p className="text-muted-foreground text-xs">Pas encore de données sur 7 jours</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ConfidencePanel
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

  const tierColor =
    tier === 'high'
      ? 'text-emerald-600'
      : tier === 'medium'
        ? 'text-amber-600'
        : 'text-muted-foreground';

  return (
    <div className="bg-card space-y-4 rounded-2xl border px-5 py-5">
      <p className="text-muted-foreground text-[10px] font-medium tracking-[0.12em] uppercase">
        Confiance SHARPIT
      </p>
      <div className="flex flex-col gap-1">
        <span className={cn('text-4xl leading-none font-bold tabular-nums', tierColor)}>{pct}</span>
        <span className="text-muted-foreground text-[11px]">/ 100</span>
      </div>
      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-[11px]">Modèles actifs</span>
          <span className="text-foreground text-[11px] font-semibold">{availableModelCount}</span>
        </div>
        <p className={cn('text-[11px]', consistencyDisplay.colorClass)}>
          {consistencyDisplay.label}
        </p>
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
      <p className="text-muted-foreground max-w-xs text-sm">
        Pas encore de données physiologiques pour aujourd'hui. Synchronise tes appareils pour
        obtenir ton bilan.
      </p>
      <button
        className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 transition-colors hover:underline"
        onClick={onRetry}
      >
        Réessayer
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardSkeleton
// ─────────────────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      {/* Row 1 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-muted h-36 rounded-2xl" />
        ))}
      </div>
      {/* Row 2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="bg-muted h-52 rounded-2xl" />
        <div className="bg-muted h-52 rounded-2xl" />
      </div>
      {/* Row 3 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr_1fr]">
        <div className="bg-muted h-44 rounded-2xl" />
        <div className="bg-muted h-44 rounded-2xl" />
        <div className="bg-muted h-44 rounded-2xl" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TodayDashboard — main component
// ─────────────────────────────────────────────────────────────────────────────

export function TodayDashboard() {
  const { data, loading, refresh } = useToday();
  const { reasoning, recovery, fatigue, adaptation } = data;

  const { data: healthEntries = [] } = useHealthEntries(14);
  const { data: activities = [] } = useActivities();

  if (loading) return <DashboardSkeleton />;

  if (!reasoning || reasoning.overallVerdict === 'INSUFFICIENT_DATA') {
    return <InsufficientDataState onRetry={refresh} />;
  }

  // Latest health entry (entries are sorted desc)
  const todayEntry = healthEntries[0] ?? null;

  // Sub-metrics
  const recoverySubMetrics: SubMetric[] = [
    {
      label: 'VFC',
      value: todayEntry?.hrv != null ? `${todayEntry.hrv} ms` : '—',
    },
    {
      label: 'FC repos',
      value: todayEntry?.restingHr != null ? `${todayEntry.restingHr} bpm` : '—',
    },
  ];

  const trainingLoad = computeTrainingLoad(
    activities.map((a) => ({ load: a.load, date: new Date(a.date) })),
    new Date(),
  );
  const effortSubMetrics: SubMetric[] = [
    {
      label: 'TSS semaine',
      value: trainingLoad.weeklyLoad > 0 ? String(trainingLoad.weeklyLoad) : '—',
    },
    {
      label: 'ACWR',
      value: trainingLoad.acwr > 0 ? String(trainingLoad.acwr) : '—',
    },
  ];

  const sleepSubMetrics: SubMetric[] = [
    {
      label: 'Durée',
      value: formatSleep(todayEntry?.sleepMinutes ?? null),
    },
    {
      label: 'Sommeil profond',
      value: formatSleep(todayEntry?.sleepDeepMin ?? null),
    },
  ];

  const recoverySignal = mapRecoveryToSignal(
    (recovery?.readinessCategory as ReadinessCategory) ?? 'INSUFFICIENT_DATA',
  );
  const fatigueSignal = mapFatigueToSignal(
    (fatigue?.fatigueLevel as FatigueLevel) ?? 'INSUFFICIENT_DATA',
    (fatigue?.trajectory as FatigueTrajectory) ?? 'STABLE',
  );

  const sleepScore = recovery?.dimensions.sleep.available
    ? (recovery.dimensions.sleep.score ?? null)
    : null;
  const sleepEntry = todayEntry;
  const sleepAdequacy = recovery?.signals.sleepAdequacy ?? 'ADEQUATE';
  const SLEEP_SIGNAL: Record<string, { label: string; arrow: string; colorClass: string }> = {
    EXCELLENT: { label: 'Excellent', arrow: '↗', colorClass: 'text-emerald-600' },
    ADEQUATE: { label: 'Correct', arrow: '→', colorClass: 'text-blue-600' },
    INSUFFICIENT: { label: 'Insuffisant', arrow: '↘', colorClass: 'text-amber-600' },
    SEVERELY_INSUFFICIENT: { label: 'Insuffisant', arrow: '↓', colorClass: 'text-red-600' },
  };
  const sleepSignal = SLEEP_SIGNAL[sleepAdequacy] ?? {
    label: '—',
    arrow: '→',
    colorClass: 'text-muted-foreground',
  };

  const { topAction } = reasoning;
  if (!topAction) return <InsufficientDataState onRetry={refresh} />;

  return (
    <div className="space-y-4">
      {/* Row 1: Score cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ScoreDashCard
          href="/today/recovery"
          label="Récupération"
          score={recovery?.readinessScore ?? null}
          subMetrics={recoverySubMetrics}
          trendArrow={recoverySignal.arrow}
          trendClass={recoverySignal.qualityClass}
          trendLabel={recoverySignal.label}
        />
        <ScoreDashCard
          href="/today/effort"
          label="Charge d'effort"
          score={fatigue?.fatigueIndex ?? null}
          subMetrics={effortSubMetrics}
          trendArrow={fatigueSignal.arrow}
          trendClass={fatigueSignal.qualityClass}
          trendLabel={fatigueSignal.label}
        />
        <ScoreDashCard
          href="/today/sleep"
          label="Sommeil"
          score={sleepScore}
          subMetrics={sleepSubMetrics}
          trendArrow={sleepSignal.arrow}
          trendClass={sleepSignal.colorClass}
          trendLabel={sleepSignal.label}
        />
      </div>

      {/* Row 2: Recommendation + Health */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
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
        <HealthMetricsPanel entry={sleepEntry} />
      </div>

      {/* Row 3: Physio gauges + Trend chart + Confidence */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr_1fr]">
        <PhysioSignalsPanel
          fatigueIndex={fatigue?.fatigueIndex ?? null}
          recoveryScore={recovery?.readinessScore ?? null}
        />
        <WeeklyTrendChart entries={healthEntries} />
        <ConfidencePanel
          availableModelCount={reasoning.signals.availableModelCount}
          confidence={reasoning.confidence}
          consistencyScore={reasoning.consistencyScore}
          physiologicalConsistency={reasoning.physiologicalConsistency as PhysiologicalConsistency}
        />
      </div>
    </div>
  );
}

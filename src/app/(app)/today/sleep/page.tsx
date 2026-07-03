'use client';

import Link from 'next/link';
import { format, isSameDay, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';
import { ArcGauge } from '@/components/ui/arc-gauge';
import { useToday } from '@/hooks/use-today';
import { useHealthEntries } from '@/hooks/use-data';
import { resolve } from '@/lib/french';
import {
  mapScoreToColorClass,
  mapSleepAdequacySignalToDisplay,
  type SleepAdequacySignal,
} from '@/lib/today-mapping';

// ─────────────────────────────────────────────────────────────────────────────
// Sleep analytical dashboard — /today/sleep
// ─────────────────────────────────────────────────────────────────────────────

const SLEEP_TARGET_MIN = 450; // 7h 30m

function formatSleepDuration(minutes: number | null): string {
  if (minutes === null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StageStack({
  deepMin,
  remMin,
  lightMin,
  awakeMin,
  totalMin,
}: {
  deepMin: number | null;
  remMin: number | null;
  lightMin: number | null;
  awakeMin: number | null;
  totalMin: number;
}) {
  const segments = [
    {
      key: 'deep',
      label: 'Profond',
      minutes: deepMin,
      bg: 'bg-blue-600',
      text: 'text-blue-600 dark:text-blue-400',
    },
    {
      key: 'rem',
      label: 'Paradoxal',
      minutes: remMin,
      bg: 'bg-violet-600',
      text: 'text-violet-600 dark:text-violet-400',
    },
    {
      key: 'light',
      label: 'Léger',
      minutes: lightMin,
      bg: 'bg-slate-400',
      text: 'text-slate-600 dark:text-slate-400',
    },
    {
      key: 'awake',
      label: 'Éveillé',
      minutes: awakeMin,
      bg: 'bg-red-400',
      text: 'text-red-600 dark:text-red-400',
    },
  ].filter((s) => s.minutes !== null && s.minutes > 0);

  if (segments.length === 0) {
    return (
      <p className="text-muted-foreground/50 text-xs">
        Cycles non disponibles. Synchronise ta montre pour obtenir les stades.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {/* Stacked bar */}
      <div className="flex h-5 w-full overflow-hidden rounded-full">
        {segments.map((s) => {
          const pct = totalMin > 0 ? (s.minutes! / totalMin) * 100 : 0;
          return (
            <div
              key={s.key}
              className={cn('h-full transition-all', s.bg)}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {segments.map((s) => {
          const pct = totalMin > 0 ? Math.round((s.minutes! / totalMin) * 100) : 0;
          return (
            <div key={s.key} className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px]">
                <span className={cn('inline-block h-2 w-2 rounded-full', s.bg)} />
                <span className="text-muted-foreground">{s.label}</span>
              </span>
              <span className={cn('text-[11px] font-semibold tabular-nums', s.text)}>
                {formatSleepDuration(s.minutes)} · {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function sleepEfficiencyColor(efficiency: number): string {
  if (efficiency >= 45) return 'text-emerald-600 dark:text-emerald-400';
  if (efficiency >= 35) return 'text-blue-600 dark:text-blue-400';
  if (efficiency >= 25) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function SleepEfficiencyGauge({ efficiency }: { efficiency: number }) {
  const colorClass = sleepEfficiencyColor(efficiency);

  return (
    <div className="flex items-center gap-4">
      <ArcGauge score={efficiency} size={64} strokeWidth={5}>
        <span className={cn('text-sm leading-none font-bold tabular-nums', colorClass)}>
          {efficiency}%
        </span>
      </ArcGauge>
      <div>
        <p className="text-xs font-semibold">Efficacité restauratrice</p>
        <p className="text-muted-foreground text-[10px]">profond + paradoxal / total</p>
        <p className="text-muted-foreground/60 mt-0.5 text-[10px]">Norme adulte : 40–55%</p>
      </div>
    </div>
  );
}

type BarPoint = { date: string; minutes: number | null; fill: string };

function SleepDurationBars({ data }: { data: BarPoint[] }) {
  const hasData = data.some((d) => d.minutes !== null);
  if (!hasData) return <p className="text-muted-foreground/40 text-xs">Pas de données</p>;

  return (
    <ResponsiveContainer height={100} width="100%">
      <BarChart data={data} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
        <XAxis
          axisLine={false}
          dataKey="date"
          tick={{ fontSize: 8, fill: 'currentColor' }}
          tickLine={false}
        />
        <YAxis domain={[0, 600]} hide />
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} vertical={false} />
        <ReferenceLine
          stroke="#f59e0b"
          strokeDasharray="4 2"
          strokeOpacity={0.6}
          y={SLEEP_TARGET_MIN}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const pt = payload[0].payload as BarPoint;
            return (
              <div className="bg-popover border-border rounded-lg border px-2 py-1 text-[10px] shadow-sm">
                <p className="font-medium">{formatSleepDuration(pt.minutes)}</p>
                <p className="text-muted-foreground">{pt.date}</p>
              </div>
            );
          }}
        />
        <Bar dataKey="minutes" radius={[2, 2, 0, 0]}>
          {data.map((entry, i) => (
            <rect key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TodaySleepPage() {
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
        <Link className="text-muted-foreground text-sm" href="/">
          ← Aujourd'hui
        </Link>
        <p className="text-muted-foreground text-sm">Données de sommeil indisponibles.</p>
      </div>
    );
  }

  const today = new Date();
  const todayEntry = healthEntries.find((e) => isSameDay(new Date(e.date), today)) ?? null;

  // Sleep stage data for today
  const deepMin = todayEntry?.sleepDeepMin ?? null;
  const remMin = todayEntry?.sleepRemMin ?? null;
  const lightMin = todayEntry?.sleepLightMin ?? null;
  const totalSleepMin = todayEntry?.sleepMinutes ?? null;
  const awakeMin =
    totalSleepMin != null && deepMin != null && remMin != null && lightMin != null
      ? Math.max(0, totalSleepMin - deepMin - remMin - lightMin)
      : null;

  // Sleep efficiency (deep + REM) / total
  const sleepEfficiency =
    deepMin != null && remMin != null && totalSleepMin != null && totalSleepMin > 0
      ? Math.round(((deepMin + remMin) / totalSleepMin) * 100)
      : null;

  // 7-day average (excluding today)
  const last7 = healthEntries.filter((e) => {
    const d = new Date(e.date);
    return d >= subDays(today, 6) && !isSameDay(d, today) && e.sleepMinutes != null;
  });
  const avgSleepMinutes7d =
    last7.length > 0
      ? Math.round(last7.reduce((s, e) => s + (e.sleepMinutes ?? 0), 0) / last7.length)
      : null;

  const sleepDelta =
    totalSleepMin != null && avgSleepMinutes7d != null ? totalSleepMin - avgSleepMinutes7d : null;
  const targetDeltaMin = totalSleepMin != null ? totalSleepMin - SLEEP_TARGET_MIN : null;

  // Scores
  const sleepDim = recovery.dimensions.sleep;
  const sleepScore = sleepDim.available ? sleepDim.score : null;
  const scoreClass = mapScoreToColorClass(sleepScore);
  const adequacyDisplay = mapSleepAdequacySignalToDisplay(
    recovery.signals.sleepAdequacy as SleepAdequacySignal,
  );

  // 14-day bar chart data
  const days14 = Array.from({ length: 14 }, (_, i) => subDays(today, 13 - i));
  const barData: BarPoint[] = days14.map((d) => {
    const e = healthEntries.find((h) => isSameDay(new Date(h.date), d));
    const mins = e?.sleepMinutes ?? null;
    let fill = '#94a3b8';
    if (mins !== null) fill = mins >= SLEEP_TARGET_MIN ? '#10b981' : '#f59e0b';
    return { date: format(d, 'dd/MM', { locale: fr }), minutes: mins, fill };
  });

  return (
    <div className="space-y-4 p-4">
      <Link
        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        href="/"
      >
        ← Aujourd'hui
      </Link>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        {/* ── LEFT COLUMN ─────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Score hero */}
          <div className="bg-card/60 rounded-2xl border px-5 py-5">
            <p className="text-muted-foreground mb-3 text-[11px] font-medium tracking-[0.15em] uppercase">
              Sommeil
            </p>
            <div className="flex items-center gap-5">
              <ArcGauge score={sleepScore} size={96} strokeWidth={7} />
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('text-sm font-semibold', adequacyDisplay.colorClass)}>
                    {adequacyDisplay.label}
                  </span>
                  {todayEntry?.sleepScore != null && (
                    <span className="text-muted-foreground rounded-full border px-2 py-0.5 text-[10px]">
                      Garmin {todayEntry.sleepScore}
                    </span>
                  )}
                </div>
                {totalSleepMin != null && (
                  <p className="text-foreground text-sm font-semibold tabular-nums">
                    {formatSleepDuration(totalSleepMin)}
                  </p>
                )}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                  {sleepDelta !== null && (
                    <span
                      className={cn(
                        'text-xs font-medium tabular-nums',
                        sleepDelta >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400',
                      )}
                    >
                      {sleepDelta >= 0 ? '+' : ''}
                      {formatSleepDuration(Math.abs(sleepDelta))} vs 7j moy
                    </span>
                  )}
                  {targetDeltaMin !== null && targetDeltaMin < 0 && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      {formatSleepDuration(Math.abs(targetDeltaMin))} sous cible 7h30
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stage composition */}
          {totalSleepMin != null && totalSleepMin > 0 && (
            <div className="bg-card/60 rounded-2xl border px-5 py-4">
              <p className="text-muted-foreground mb-3 text-[11px] font-medium tracking-[0.15em] uppercase">
                Architecture du sommeil
              </p>
              <StageStack
                awakeMin={awakeMin}
                deepMin={deepMin}
                lightMin={lightMin}
                remMin={remMin}
                totalMin={totalSleepMin}
              />
            </div>
          )}

          {/* Efficiency gauge */}
          {sleepEfficiency !== null && (
            <div className="bg-card/60 rounded-2xl border px-5 py-4">
              <SleepEfficiencyGauge efficiency={sleepEfficiency} />
            </div>
          )}

          {/* Dual scores */}
          {(todayEntry?.sleepScore != null || sleepScore !== null) && (
            <div className="bg-card/60 rounded-2xl border px-5 py-4">
              <p className="text-muted-foreground mb-3 text-[11px] font-medium tracking-[0.15em] uppercase">
                Scores sommeil
              </p>
              <div className="grid grid-cols-2 gap-4">
                {todayEntry?.sleepScore != null && (
                  <div>
                    <p className="text-muted-foreground text-[10px]">Score Garmin</p>
                    <p
                      className={cn(
                        'text-2xl font-bold tabular-nums',
                        mapScoreToColorClass(todayEntry.sleepScore),
                      )}
                    >
                      {todayEntry.sleepScore}
                    </p>
                    <p className="text-muted-foreground text-[10px]">évaluation appareil</p>
                  </div>
                )}
                {sleepScore !== null && (
                  <div>
                    <p className="text-muted-foreground text-[10px]">Score SHARPIT</p>
                    <p className={cn('text-2xl font-bold tabular-nums', scoreClass)}>
                      {sleepScore}
                    </p>
                    <p className="text-muted-foreground text-[10px]">impact récupération</p>
                  </div>
                )}
              </div>
              {todayEntry?.sleepScore != null && sleepScore !== null && (
                <p className="text-muted-foreground/60 mt-2 text-[10px]">
                  Garmin évalue la qualité. SHARPIT mesure la contribution à la récupération.
                </p>
              )}
            </div>
          )}

          {/* Recovery impact */}
          <div className="bg-card/60 rounded-2xl border px-5 py-4">
            <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
              Impact sur la récupération
            </p>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs">Adéquation</p>
                <span className={cn('text-xs font-medium', adequacyDisplay.colorClass)}>
                  {adequacyDisplay.label}
                </span>
              </div>
              {recovery.signals.dissonanceDetected && (
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  ⚡ Signaux contradictoires détectés
                </p>
              )}
              {recovery.primaryLimitingFactor === 'sleep' && (
                <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
                  ↑ Sommeil = principal facteur limitant aujourd'hui
                </p>
              )}
            </div>
            {sleepDim.status && (
              <p className="text-muted-foreground mt-2 text-xs">
                Statut : <span className="text-foreground font-medium">{sleepDim.status}</span>
              </p>
            )}
          </div>

          {/* Key evidence */}
          {recovery.recommendation.keyEvidence.length > 0 && (
            <div className="bg-card/40 space-y-2 rounded-2xl border px-5 py-4">
              <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
                Signaux de récupération
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

        {/* ── RIGHT COLUMN ────────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* 14-day duration bars */}
          <div className="bg-card/60 rounded-2xl border px-4 py-4">
            <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-[0.15em] uppercase">
              Durée — 14 jours
            </p>
            <SleepDurationBars data={barData} />
            <div className="mt-1 flex items-center gap-3">
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                <span className="inline-block h-1.5 w-3 rounded-full bg-emerald-500" />≥ 7h30
              </span>
              <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                <span className="inline-block h-1.5 w-3 rounded-full bg-amber-500" />
                &lt; 7h30
              </span>
            </div>
          </div>

          {/* 7-day context */}
          {avgSleepMinutes7d !== null && (
            <div className="bg-card/60 rounded-2xl border px-4 py-4">
              <p className="text-muted-foreground mb-2 text-[11px] font-medium tracking-[0.15em] uppercase">
                Moyenne 7 jours
              </p>
              <p className="text-sm font-semibold tabular-nums">
                {formatSleepDuration(avgSleepMinutes7d)}
              </p>
              {avgSleepMinutes7d < SLEEP_TARGET_MIN && (
                <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  ↓ Sous cible 7h30 — dette possible
                </p>
              )}
            </div>
          )}

          {/* Unavailable state */}
          {!sleepDim.available && totalSleepMin == null && (
            <div className="rounded-2xl border border-slate-300/60 bg-slate-50/60 px-4 py-4 dark:border-slate-700/40 dark:bg-slate-900/40">
              <p className="text-muted-foreground text-sm">
                Données indisponibles. Synchronise ta montre Garmin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

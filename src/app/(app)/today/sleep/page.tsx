'use client';

import { useEffect, useRef } from 'react';
import { ArcGauge } from '@/components/ui/arc-gauge';
import { useAthleteProfile, useHealthEntries } from '@/hooks/use-data';
import { useToday } from '@/hooks/use-today';
import { resolve } from '@/lib/french';
import {
  buildSleepScoreBreakdown,
  computeSleepDebt7d,
  formatSleepDuration,
  mapSleepScoreToAdequacy,
  restorativeRatioLabel,
  SLEEP_TARGET_MIN,
} from '@/lib/sleep-scoring';
import {
  mapRecoveryToSignal,
  mapScoreToColorClass,
  mapSleepAdequacySignalToDisplay,
  type ReadinessCategory,
} from '@/lib/today-mapping';
import { cn } from '@/lib/utils';
import { format, isSameDay, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// Sleep analytical dashboard — /today/sleep
// ─────────────────────────────────────────────────────────────────────────────

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
    <div className="w-full">
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
      <div className="mt-1.5 flex w-full">
        {segments.map((s) => {
          const pct = totalMin > 0 ? Math.round((s.minutes! / totalMin) * 100) : 0;
          const narrow = pct < 14;
          return (
            <div
              key={s.key}
              className="min-w-0 px-0.5"
              style={{ width: `${totalMin > 0 ? (s.minutes! / totalMin) * 100 : 0}%` }}
            >
              <p
                className={cn(
                  'text-muted-foreground truncate text-center leading-tight',
                  narrow ? 'text-[9px]' : 'text-[10px]',
                )}
              >
                {s.label}
              </p>
              <p
                className={cn(
                  'truncate text-center leading-tight font-semibold tabular-nums',
                  narrow ? 'text-[9px]' : 'text-[10px]',
                  s.text,
                )}
              >
                {formatSleepDuration(s.minutes)} · {pct}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function restorativeRatioColors(ratio: number): { textClass: string; stroke: string } {
  if (ratio >= 45) {
    return { textClass: 'text-emerald-600 dark:text-emerald-400', stroke: '#10b981' };
  }
  if (ratio >= 35) {
    return { textClass: 'text-blue-600 dark:text-blue-400', stroke: '#3b82f6' };
  }
  if (ratio >= 25) {
    return { textClass: 'text-amber-600 dark:text-amber-400', stroke: '#f59e0b' };
  }
  return { textClass: 'text-red-600 dark:text-red-400', stroke: '#ef4444' };
}

function SleepEfficiencyGauge({ efficiency }: { efficiency: number }) {
  const { textClass, stroke } = restorativeRatioColors(efficiency);

  return (
    <div className="flex items-center gap-4">
      <ArcGauge score={efficiency} size={64} strokeColor={stroke} strokeWidth={5}>
        <span className={cn('text-sm leading-none font-bold tabular-nums', textClass)}>
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
  const { data, loading, refresh } = useToday();
  const { recovery } = data;
  const { data: healthEntries = [] } = useHealthEntries(14);
  const { data: athleteProfile } = useAthleteProfile();
  const refreshed = useRef(false);

  useEffect(() => {
    if (!refreshed.current) {
      refreshed.current = true;
      refresh();
    }
  }, [refresh]);

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

  const sleepTargetMin = athleteProfile?.sleepTargetMinutes ?? SLEEP_TARGET_MIN;

  const sleepDebt7d = computeSleepDebt7d(healthEntries, today, sleepTargetMin);
  const scoreBreakdown = buildSleepScoreBreakdown(deepMin, remMin, totalSleepMin, sleepDebt7d);
  const sleepEfficiency = scoreBreakdown.restorativeRatio;

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
  const targetDeltaMin = totalSleepMin != null ? totalSleepMin - sleepTargetMin : null;

  // Score live depuis les données Garmin (même formule que le moteur recovery)
  const sleepDim = recovery.dimensions.sleep;
  const sleepScore =
    scoreBreakdown.sharpitScore ?? (sleepDim.available ? (sleepDim.score ?? null) : null);
  const scoreClass = mapScoreToColorClass(sleepScore);
  const adequacyDisplay = mapSleepAdequacySignalToDisplay(mapSleepScoreToAdequacy(sleepScore));

  const autonomicScore = recovery.dimensions.autonomic.available
    ? recovery.dimensions.autonomic.score
    : null;
  const recoverySignal = mapRecoveryToSignal(recovery.readinessCategory as ReadinessCategory);

  const filteredEvidence = recovery.recommendation.keyEvidence
    .map((e) => resolve(e))
    .filter((line, index, arr) => {
      const lower = line.toLowerCase();
      if (lower.includes('sommeil limite') && recovery.primaryLimitingFactor === 'sleep') {
        return false;
      }
      return arr.indexOf(line) === index;
    })
    .slice(0, 3);

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
            <p className="text-muted-foreground mb-3 text-[11px] font-medium uppercase">Sommeil</p>
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
              <p className="text-muted-foreground mb-3 text-[11px] font-medium uppercase">
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

          {/* Pourquoi ce score SHARPIT */}
          {sleepScore !== null && scoreBreakdown.restorativeRatio != null && (
            <div className="bg-card/60 space-y-3 rounded-2xl border px-5 py-4">
              <p className="text-muted-foreground text-[11px] font-medium uppercase">
                Pourquoi ce score SHARPIT
              </p>
              <ul className="text-muted-foreground space-y-1.5 text-xs leading-relaxed">
                <li>
                  <span className="text-foreground font-medium">Architecture restauratrice :</span>{' '}
                  {scoreBreakdown.restorativeRatio} % (
                  {restorativeRatioLabel(scoreBreakdown.restorativeRatio)})
                  {remMin != null && remMin < 45 && ' — paradoxal faible'}
                </li>
                {scoreBreakdown.debtMin != null && scoreBreakdown.debtMin > 30 && (
                  <li>
                    <span className="text-foreground font-medium">Dette 7 jours :</span>{' '}
                    {formatSleepDuration(scoreBreakdown.debtMin)} sous la cible cumulée
                  </li>
                )}
                {todayEntry?.sleepScore != null && (
                  <li>
                    <span className="text-foreground font-medium">
                      Garmin {todayEntry.sleepScore}
                    </span>{' '}
                    = qualité perçue par l&apos;appareil. SHARPIT croise architecture + dette pour
                    l&apos;impact récupération.
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Récupération globale */}
          {recovery.readinessScore != null && (
            <div className="bg-card/60 rounded-2xl border px-5 py-4">
              <p className="text-muted-foreground text-[11px] font-medium uppercase">
                Lien récupération globale
              </p>
              <p className="mt-2 text-sm font-semibold tabular-nums">
                {recovery.readinessScore}/100 — {recoverySignal.label.toLowerCase()}
              </p>
              <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                {autonomicScore != null && sleepScore != null && autonomicScore > sleepScore
                  ? `VFC et autres signaux (${autonomicScore}/100) compensent partiellement un sommeil à ${sleepScore}/100.`
                  : 'Le sommeil pèse fortement dans le score récupération du jour.'}
                {recovery.primaryLimitingFactor === 'sleep' &&
                  ' C’est le facteur limitant principal aujourd’hui.'}
              </p>
              {recovery.signals.dissonanceDetected && (
                <p className="mt-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                  Signaux contradictoires entre dimensions — prudence recommandée.
                </p>
              )}
            </div>
          )}

          {/* Scores côte à côte */}
          {(todayEntry?.sleepScore != null || sleepScore !== null) && (
            <div className="bg-card/60 rounded-2xl border px-5 py-4">
              <p className="text-muted-foreground mb-3 text-[11px] font-medium uppercase">
                Deux lectures du sommeil
              </p>
              <div className="grid grid-cols-2 gap-4">
                {todayEntry?.sleepScore != null && (
                  <div>
                    <p className="text-muted-foreground text-[10px]">Garmin</p>
                    <p
                      className={cn(
                        'text-2xl font-bold tabular-nums',
                        mapScoreToColorClass(todayEntry.sleepScore),
                      )}
                    >
                      {todayEntry.sleepScore}
                    </p>
                    <p className="text-muted-foreground text-[10px]">qualité globale</p>
                  </div>
                )}
                {sleepScore !== null && (
                  <div>
                    <p className="text-muted-foreground text-[10px]">SHARPIT</p>
                    <p className={cn('text-2xl font-bold tabular-nums', scoreClass)}>
                      {sleepScore}
                    </p>
                    <p className="text-muted-foreground text-[10px]">{adequacyDisplay.label}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Key evidence (sans doublons) */}
          {filteredEvidence.length > 0 && (
            <div className="bg-card/40 space-y-2 rounded-2xl border px-5 py-4">
              <p className="text-muted-foreground text-[11px] font-medium uppercase">
                Contexte récupération
              </p>
              <ul className="space-y-1">
                {filteredEvidence.map((line, i) => (
                  <li
                    key={i}
                    className="text-muted-foreground text-xs before:mr-1.5 before:content-['·']"
                  >
                    {line}
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
            <p className="text-muted-foreground mb-2 text-[11px] font-medium uppercase">
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
              <p className="text-muted-foreground mb-2 text-[11px] font-medium uppercase">
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

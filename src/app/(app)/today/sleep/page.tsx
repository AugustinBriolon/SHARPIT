'use client';

import Link from 'next/link';
import { isSameDay, subDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToday } from '@/hooks/use-today';
import { useHealthEntries } from '@/hooks/use-data';
import { resolve } from '@/lib/french';
import {
  mapScoreToColorClass,
  mapSleepAdequacySignalToDisplay,
  type SleepAdequacySignal,
} from '@/lib/today-mapping';

// ─────────────────────────────────────────────────────────────────────────────
// Sleep detail page — /today/sleep
// ─────────────────────────────────────────────────────────────────────────────

function formatSleepDuration(minutes: number | null): string {
  if (minutes === null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

// Proportional bar for a sleep stage
function StageBar({
  label,
  minutes,
  totalMinutes,
  colorClass,
  bgClass,
}: {
  label: string;
  minutes: number | null;
  totalMinutes: number;
  colorClass: string;
  bgClass: string;
}) {
  if (minutes === null) return null;
  const pct = totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0;
  return (
    <div className="grid grid-cols-[6rem_1fr_4rem_2rem] items-center gap-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <div className="bg-muted h-1.5 overflow-hidden rounded-full">
        <div
          className={cn('h-full rounded-full transition-all', bgClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className={cn('text-right text-xs font-semibold tabular-nums', colorClass)}>
        {formatSleepDuration(minutes)}
      </p>
      <p className="text-muted-foreground text-right text-[10px] tabular-nums">{pct}%</p>
    </div>
  );
}

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

  // 7-day sleep average (excluding today)
  const last7Entries = healthEntries.filter((e) => {
    const d = new Date(e.date);
    return d >= subDays(today, 6) && !isSameDay(d, today) && e.sleepMinutes != null;
  });
  const avgSleepMinutes7d =
    last7Entries.length > 0
      ? Math.round(
          last7Entries.reduce((s, e) => s + (e.sleepMinutes ?? 0), 0) / last7Entries.length,
        )
      : null;

  // Infer awake time
  const deepMin = todayEntry?.sleepDeepMin ?? null;
  const remMin = todayEntry?.sleepRemMin ?? null;
  const lightMin = todayEntry?.sleepLightMin ?? null;
  const totalSleepMin = todayEntry?.sleepMinutes ?? null;
  const awakeMin =
    totalSleepMin != null && deepMin != null && remMin != null && lightMin != null
      ? Math.max(0, totalSleepMin - deepMin - remMin - lightMin)
      : null;

  // Sleep efficiency = restorative stages (deep + REM) / total
  const sleepEfficiency =
    deepMin != null && remMin != null && totalSleepMin != null && totalSleepMin > 0
      ? Math.round(((deepMin + remMin) / totalSleepMin) * 100)
      : null;

  // Adequacy
  const sleepDim = recovery.dimensions.sleep;
  const sleepScore = sleepDim.available ? sleepDim.score : null;
  const scoreClass = mapScoreToColorClass(sleepScore);
  const adequacyDisplay = mapSleepAdequacySignalToDisplay(
    recovery.signals.sleepAdequacy as SleepAdequacySignal,
  );

  // Delta vs 7d avg
  const sleepDelta =
    totalSleepMin != null && avgSleepMinutes7d != null ? totalSleepMin - avgSleepMinutes7d : null;

  // How much of target (7-8h = 420-480 min) was achieved
  const SLEEP_TARGET_MIN = 450; // 7h 30m midpoint
  const targetDeltaMin = totalSleepMin != null ? totalSleepMin - SLEEP_TARGET_MIN : null;

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
          Sommeil
        </p>
        <div className="flex items-baseline gap-3">
          <span className={cn('text-5xl font-bold tabular-nums', scoreClass)}>
            {sleepScore !== null ? sleepScore : '—'}
          </span>
          <span className={cn('text-sm font-medium', adequacyDisplay.colorClass)}>
            {adequacyDisplay.label}
          </span>
        </div>
        {totalSleepMin != null && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1">
            <span className="text-muted-foreground text-xs">
              Durée :{' '}
              <span className="text-foreground font-medium">
                {formatSleepDuration(totalSleepMin)}
              </span>
            </span>
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
            {targetDeltaMin !== null && (
              <span
                className={cn(
                  'text-xs tabular-nums',
                  targetDeltaMin >= 0
                    ? 'text-muted-foreground'
                    : 'text-amber-600 dark:text-amber-400',
                )}
              >
                {targetDeltaMin >= 0
                  ? `+${formatSleepDuration(targetDeltaMin)} vs cible 7h30`
                  : `${formatSleepDuration(Math.abs(targetDeltaMin))} sous cible 7h30`}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Dual score — Garmin raw vs inference score */}
      {(todayEntry?.sleepScore != null || sleepScore !== null) && (
        <div className="bg-card/60 space-y-3 rounded-2xl border px-5 py-4">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
            Scores sommeil
          </p>
          <div className="grid grid-cols-2 gap-4">
            {todayEntry?.sleepScore != null && (
              <div>
                <p className="text-muted-foreground text-[10px]">Score Garmin</p>
                <p
                  className={cn(
                    'text-xl font-bold tabular-nums',
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
                <p className={cn('text-xl font-bold tabular-nums', scoreClass)}>{sleepScore}</p>
                <p className="text-muted-foreground text-[10px]">impact récupération</p>
              </div>
            )}
          </div>
          {todayEntry?.sleepScore != null && sleepScore !== null && (
            <p className="text-muted-foreground/60 text-[10px]">
              Le score Garmin évalue la qualité du sommeil selon leur algorithme. Le score SHARPIT
              mesure la contribution du sommeil à ta récupération physiologique.
            </p>
          )}
        </div>
      )}

      {/* Sleep stages breakdown */}
      {totalSleepMin != null && totalSleepMin > 0 && (
        <div className="bg-card/60 space-y-3 rounded-2xl border px-5 py-4">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
            Architecture du sommeil
          </p>
          <div className="space-y-2.5">
            <StageBar
              bgClass="bg-blue-600"
              colorClass="text-blue-600 dark:text-blue-400"
              label="Profond"
              minutes={deepMin}
              totalMinutes={totalSleepMin}
            />
            <StageBar
              bgClass="bg-violet-600"
              colorClass="text-violet-600 dark:text-violet-400"
              label="Paradoxal"
              minutes={remMin}
              totalMinutes={totalSleepMin}
            />
            <StageBar
              bgClass="bg-slate-400"
              colorClass="text-slate-600 dark:text-slate-400"
              label="Léger"
              minutes={lightMin}
              totalMinutes={totalSleepMin}
            />
            <StageBar
              bgClass="bg-red-400"
              colorClass="text-red-600 dark:text-red-400"
              label="Éveillé"
              minutes={awakeMin}
              totalMinutes={totalSleepMin}
            />
          </div>
          {deepMin == null && remMin == null && (
            <p className="text-muted-foreground/60 text-[10px]">
              Données de cycles non disponibles. Synchronise ta montre pour obtenir le détail des
              stades.
            </p>
          )}
        </div>
      )}

      {/* Sleep efficiency */}
      {sleepEfficiency !== null && (
        <div className="bg-card/60 rounded-2xl border px-5 py-4">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
            Efficacité restauratrice
          </p>
          <div className="mt-2 flex items-end gap-3">
            <span
              className={cn(
                'text-3xl font-bold tabular-nums',
                sleepEfficiency >= 45
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : sleepEfficiency >= 35
                    ? 'text-blue-600 dark:text-blue-400'
                    : sleepEfficiency >= 25
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400',
              )}
            >
              {sleepEfficiency}%
            </span>
            <span className="text-muted-foreground mb-1 text-xs">profond + paradoxal / total</span>
          </div>
          <div className="bg-muted mt-2 h-2 overflow-hidden rounded-full">
            <div
              style={{ width: `${Math.min(sleepEfficiency, 100)}%` }}
              className={cn(
                'h-full rounded-full transition-all',
                sleepEfficiency >= 45
                  ? 'bg-emerald-500'
                  : sleepEfficiency >= 35
                    ? 'bg-blue-500'
                    : sleepEfficiency >= 25
                      ? 'bg-amber-500'
                      : 'bg-red-500',
              )}
            />
          </div>
          <p className="text-muted-foreground mt-1.5 text-[10px]">
            Norme adulte : 40–55% de sommeil profond + paradoxal. En dessous de 30% : récupération
            compromise.
          </p>
        </div>
      )}

      {/* 7-day context */}
      {avgSleepMinutes7d !== null && (
        <div className="bg-card/60 rounded-2xl border px-5 py-4">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
            Contexte 7 jours
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm font-semibold tabular-nums">
              {formatSleepDuration(avgSleepMinutes7d)}
            </span>
            <span className="text-muted-foreground text-xs">durée moyenne sur 7 jours</span>
          </div>
          {targetDeltaMin !== null && avgSleepMinutes7d < SLEEP_TARGET_MIN && (
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              ↓ Moyenne sous la cible recommandée (7h30) — dette de sommeil possible
            </p>
          )}
        </div>
      )}

      {/* Impact on recovery */}
      <div className="bg-card/60 rounded-2xl border px-5 py-4">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Impact sur la récupération
        </p>
        <div className="mt-2 space-y-2">
          {sleepDim.available && (
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs">Contribution au score de récupération</p>
              <span className={cn('text-xs font-semibold tabular-nums', scoreClass)}>
                {sleepScore !== null ? sleepScore : '—'}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">Adéquation du sommeil</p>
            <span className={cn('text-xs font-medium', adequacyDisplay.colorClass)}>
              {adequacyDisplay.label}
            </span>
          </div>
          {recovery.signals.dissonanceDetected && (
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              ⚡ Signaux contradictoires — bien-être subjectif et marqueurs objectifs divergent
            </p>
          )}
          {recovery.primaryLimitingFactor === 'sleep' && (
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              ↑ Le sommeil est le principal facteur limitant ta récupération aujourd'hui
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

      {!sleepDim.available && totalSleepMin == null && (
        <div className="rounded-2xl border border-slate-300/60 bg-slate-50/60 px-5 py-4 dark:border-slate-700/40 dark:bg-slate-900/40">
          <p className="text-muted-foreground text-sm">
            Données de sommeil non disponibles. Synchronise ta montre Garmin pour obtenir le détail
            des stades et le score de récupération nocturne.
          </p>
        </div>
      )}
    </div>
  );
}

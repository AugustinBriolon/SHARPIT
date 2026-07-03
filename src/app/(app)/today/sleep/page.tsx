'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToday } from '@/hooks/use-today';
import { resolve } from '@/lib/french';
import {
  mapScoreToColorClass,
  mapSleepAdequacySignalToDisplay,
  type SleepAdequacySignal,
} from '@/lib/today-mapping';

// ─────────────────────────────────────────────────────────────────────────────
// Sleep detail page — /today/sleep
// ─────────────────────────────────────────────────────────────────────────────

export default function TodaySleepPage() {
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
        <p className="text-muted-foreground text-sm">Données de sommeil indisponibles.</p>
      </div>
    );
  }

  const sleepDim = recovery.dimensions.sleep;
  const sleepScore = sleepDim.available ? sleepDim.score : null;
  const scoreClass = mapScoreToColorClass(sleepScore);
  const adequacyDisplay = mapSleepAdequacySignalToDisplay(
    recovery.signals.sleepAdequacy as SleepAdequacySignal,
  );

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
        {recovery.estimatedTimeToFullRecovery !== null &&
          recovery.estimatedTimeToFullRecovery > 0 && (
            <p className="text-muted-foreground pt-1 text-xs">
              Récupération complète estimée dans{' '}
              <span className="text-foreground font-medium">
                {recovery.estimatedTimeToFullRecovery === 1
                  ? '1 jour'
                  : `${recovery.estimatedTimeToFullRecovery} jours`}
              </span>
            </p>
          )}
      </div>

      {/* Sleep dimension status */}
      {sleepDim.available && (
        <div className="bg-card/60 space-y-3 rounded-2xl border px-5 py-4">
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
            Qualité du sommeil
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs">Score de restauration</p>
              <span className={cn('text-xs font-semibold tabular-nums', scoreClass)}>
                {sleepScore !== null ? sleepScore : '—'}
              </span>
            </div>
            {sleepScore !== null && (
              <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                <div
                  style={{ width: `${sleepScore}%` }}
                  className={cn(
                    'h-full rounded-full',
                    scoreClass.replace('text-', 'bg-').split(' ')[0],
                  )}
                />
              </div>
            )}
            {sleepDim.status && (
              <p className="text-muted-foreground text-xs">
                Statut : <span className="text-foreground font-medium">{sleepDim.status}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Autonomic signal — sleep affects HRV */}
      <div className="bg-card/60 rounded-2xl border px-5 py-4">
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Impact sur la récupération
        </p>
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-xs">Système autonome (VFC)</p>
            <span
              className={cn(
                'text-xs font-medium',
                mapSleepAdequacySignalToDisplay(
                  recovery.signals.sleepAdequacy as SleepAdequacySignal,
                ).colorClass,
              )}
            >
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

      {!sleepDim.available && (
        <p className="text-muted-foreground text-sm">
          Les données de sommeil ne sont pas encore disponibles pour cette journée.
        </p>
      )}
    </div>
  );
}

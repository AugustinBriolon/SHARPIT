'use client';

import { cn } from '@/lib/utils';
import {
  mapRecoveryToSignal,
  mapFatigueToSignal,
  mapAdaptationToSignal,
  type ReadinessCategory,
  type FatigueLevel,
  type FatigueTrajectory,
  type AdaptationStatus,
  type AdaptationTrend,
} from '@/lib/today-mapping';
import { resolve } from '@/lib/french';
import type { RecoveryData, FatigueData, AdaptationData, LimitingFactor } from '@/hooks/use-today';

// ─────────────────────────────────────────────────────────────────────────────
// HealthMonitorBlock — compact physiological signals + limiting factor
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_LABEL: Record<string, string> = {
  RECOVERY: 'Récupération',
  FATIGUE: 'Fatigue',
  ADAPTATION: 'Adaptation',
};

function SignalRow({
  title,
  label,
  arrow,
  qualityClass,
}: {
  title: string;
  label: string;
  arrow: string;
  qualityClass: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-muted-foreground text-xs">{title}</p>
      <span className={cn('flex items-center gap-1 text-xs font-semibold', qualityClass)}>
        {label}
        <span className="text-[10px]" aria-hidden>
          {arrow}
        </span>
      </span>
    </div>
  );
}

interface HealthMonitorBlockProps {
  recovery: RecoveryData | null;
  fatigue: FatigueData | null;
  adaptation: AdaptationData | null;
  limitingFactor: LimitingFactor;
}

export function HealthMonitorBlock({
  recovery,
  fatigue,
  adaptation,
  limitingFactor,
}: HealthMonitorBlockProps) {
  if (!recovery && !fatigue && !adaptation) return null;

  const recoverySignal = recovery
    ? mapRecoveryToSignal(recovery.readinessCategory as ReadinessCategory)
    : null;
  const fatigueSignal = fatigue
    ? mapFatigueToSignal(
        fatigue.fatigueLevel as FatigueLevel,
        fatigue.trajectory as FatigueTrajectory,
      )
    : null;
  const adaptationSignal = adaptation
    ? mapAdaptationToSignal(
        adaptation.adaptationStatus as AdaptationStatus,
        adaptation.adaptationTrend as AdaptationTrend,
      )
    : null;

  const hasLimiter = limitingFactor.system || limitingFactor.description;

  return (
    <div className="bg-card/40 space-y-3 rounded-2xl border px-5 py-4">
      <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
        Signaux physiologiques
      </p>

      <div className="space-y-2">
        {recovery && recoverySignal?.isAvailable && (
          <SignalRow
            arrow={recoverySignal.arrow}
            label={recoverySignal.label}
            qualityClass={recoverySignal.qualityClass}
            title="Récupération"
          />
        )}
        {fatigue && fatigueSignal?.isAvailable && (
          <SignalRow
            arrow={fatigueSignal.arrow}
            label={fatigueSignal.label}
            qualityClass={fatigueSignal.qualityClass}
            title="Fatigue"
          />
        )}
        {adaptation && adaptationSignal?.isAvailable && (
          <SignalRow
            arrow={adaptationSignal.arrow}
            label={adaptationSignal.label}
            qualityClass={adaptationSignal.qualityClass}
            title="Adaptation"
          />
        )}
      </div>

      {hasLimiter && (
        <div className="border-t pt-3">
          <p className="text-muted-foreground text-[10px] font-medium tracking-[0.12em] uppercase">
            Limiteur principal
          </p>
          <p className="mt-1 text-xs font-medium">
            {limitingFactor.system
              ? (SYSTEM_LABEL[limitingFactor.system] ?? limitingFactor.system)
              : null}
          </p>
          {limitingFactor.description && (
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
              {resolve(limitingFactor.description)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

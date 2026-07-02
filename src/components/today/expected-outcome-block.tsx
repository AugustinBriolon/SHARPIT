'use client';

import { cn } from '@/lib/utils';
import {
  mapRecoveryProjection,
  mapFatigueProjection,
  mapAdaptationProjection,
  mapDeviationRisk,
  type RecoveryDecisionVerdict,
  type FatigueDecisionVerdict,
  type AdaptationDecisionVerdict,
  type OverreachingRisk,
  type TrainingCapacity,
  type FatigueTrajectory,
} from '@/lib/today-mapping';
import type { Opportunity } from '@/hooks/use-today';

// ─────────────────────────────────────────────────────────────────────────────
// ExpectedOutcomeBlock — what will happen if the athlete follows the plan
// ─────────────────────────────────────────────────────────────────────────────

interface ExpectedOutcomeBlockProps {
  opportunities: Opportunity[];
  recoveryVerdict: RecoveryDecisionVerdict | null;
  fatigueVerdict: FatigueDecisionVerdict | null;
  adaptationVerdict: AdaptationDecisionVerdict | null;
  loadMultiplier: number;
  overreachingRisk: OverreachingRisk;
  functionalOverreachingRisk: OverreachingRisk;
  fatigueTrajectory: FatigueTrajectory;
  trainingCapacity: TrainingCapacity;
}

interface ProjectionRowProps {
  dimension: string;
  projection: string;
}

function ProjectionRow({ dimension, projection }: ProjectionRowProps) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-muted-foreground mt-0.5 w-20 shrink-0 text-[10px] font-medium tracking-wide uppercase">
        {dimension}
      </span>
      <p className="text-sm leading-snug">{projection}</p>
    </div>
  );
}

export function ExpectedOutcomeBlock({
  opportunities,
  recoveryVerdict,
  fatigueVerdict,
  adaptationVerdict,
  loadMultiplier,
  overreachingRisk,
  functionalOverreachingRisk,
  fatigueTrajectory,
  trainingCapacity,
}: ExpectedOutcomeBlockProps) {
  const [primary] = opportunities;

  const recoveryProjection = recoveryVerdict
    ? mapRecoveryProjection(recoveryVerdict, overreachingRisk)
    : '';
  const fatigueProjection = fatigueVerdict
    ? mapFatigueProjection(fatigueVerdict, fatigueTrajectory, trainingCapacity)
    : '';
  const adaptationProjection = adaptationVerdict
    ? mapAdaptationProjection(adaptationVerdict, loadMultiplier)
    : '';

  const hasProjections = recoveryProjection || fatigueProjection || adaptationProjection;
  const deviation = mapDeviationRisk(
    overreachingRisk,
    functionalOverreachingRisk,
    fatigueTrajectory,
  );

  if (!primary && !hasProjections) return null;

  return (
    <div className="bg-card/60 space-y-4 rounded-2xl border px-5 py-5">
      <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
        Expected outcome
      </p>

      {/* Primary opportunity */}
      {primary && (
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-emerald-500" aria-hidden>
            ✓
          </span>
          <div>
            <p className="text-sm font-medium">
              {primary.description ??
                `+${Math.round(primary.expectedBenefit * 100)}% expected benefit`}
            </p>
            {primary.timeWindow && (
              <p className="text-muted-foreground mt-0.5 text-xs">
                Expected within {primary.timeWindow}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Physiological projections */}
      {hasProjections && (
        <div className="space-y-2.5 border-t pt-3">
          {recoveryProjection && (
            <ProjectionRow dimension="Recovery" projection={recoveryProjection} />
          )}
          {fatigueProjection && (
            <ProjectionRow dimension="Fatigue" projection={fatigueProjection} />
          )}
          {adaptationProjection && (
            <ProjectionRow dimension="Adaptation" projection={adaptationProjection} />
          )}
        </div>
      )}

      {/* Deviation warning */}
      {deviation.level !== 'safe' && (
        <p
          className={cn(
            'border-t pt-3 text-xs leading-relaxed',
            deviation.level === 'warning'
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-600 dark:text-amber-400',
          )}
        >
          {deviation.level === 'warning' ? '⚠ ' : ''}
          {deviation.message}
        </p>
      )}
    </div>
  );
}

'use client';

import { CheckCircle2, AlertTriangle } from 'lucide-react';
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
import { resolve } from '@/lib/french';
import type { Opportunity } from '@/hooks/use-today';

// ─────────────────────────────────────────────────────────────────────────────
// Time window labels
// ─────────────────────────────────────────────────────────────────────────────

const TIME_WINDOW_FR: Record<string, string> = {
  TODAY: "aujourd'hui",
  THIS_WEEK: 'cette semaine',
  NEXT_WEEK: 'la semaine prochaine',
};

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
      <span className="text-muted-foreground mt-0.5 w-24 shrink-0 text-[10px] font-medium tracking-wide uppercase">
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
        Résultat attendu
      </p>

      {/* Primary opportunity */}
      {primary && (
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
          <div>
            <p className="text-sm font-medium">{resolve(primary.title)}</p>
            {primary.timeWindow && (
              <p className="text-muted-foreground mt-0.5 text-xs">
                Attendu {TIME_WINDOW_FR[primary.timeWindow] ?? primary.timeWindow}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Physiological projections */}
      {hasProjections && (
        <div className="space-y-2.5 border-t pt-3">
          {recoveryProjection && (
            <ProjectionRow dimension="Récupération" projection={recoveryProjection} />
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
        <div
          className={cn(
            'flex items-start gap-2 border-t pt-3',
            deviation.level === 'warning'
              ? 'text-red-600 dark:text-red-400'
              : 'text-amber-600 dark:text-amber-400',
          )}
        >
          {deviation.level === 'warning' && (
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          )}
          <p className="text-xs leading-relaxed">{deviation.message}</p>
        </div>
      )}
    </div>
  );
}

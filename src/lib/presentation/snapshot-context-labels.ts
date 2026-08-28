/**
 * Shared label resolution for a frozen DecisionSnapshotContext (Decision Memory) — reused
 * by Session Rationale and the Weekly Coaching Brief so both describe "what SHARPIT
 * inferred" identically.
 */

import {
  mapVerdictToDisplay,
  mapFatigueCapacityLabel,
  type OverallVerdict,
} from '@/lib/today/today-mapping';
import { CAPACITY_LABELS } from '@/lib/presentation/physical-health';
import type { TrainingCapacity } from '@/hooks/use-today';
import type { DecisionSnapshotContext } from '@/lib/decision-memory/types';

const CONFIDENCE_TIER_LABEL: Record<string, string> = {
  HIGH: 'Confiance élevée',
  MEDIUM: 'Confiance modérée',
  LOW: 'Confiance faible',
  INSUFFICIENT: 'Confiance insuffisante — données incomplètes',
};

const LIMITING_FACTOR_SYSTEM_LABEL: Record<string, string> = {
  RECOVERY: 'Récupération',
  FATIGUE: 'Fatigue',
  ADAPTATION: 'Adaptation',
  PHYSICAL_HEALTH: 'Santé physique',
};

export type SnapshotContextLabels = {
  readonly overallVerdictLabel: string | null;
  readonly confidenceTierLabel: string | null;
  readonly limitingFactorLabel: string | null;
  readonly physicalHealthCapacityLabel: string | null;
  readonly fatigueTrainingCapacityLabel: string | null;
};

function lookupLabel<T extends string>(
  map: Record<string, string>,
  value: T | null | undefined,
): string | null {
  return value ? (map[value] ?? value) : null;
}

export function describeSnapshotContext(context: DecisionSnapshotContext): SnapshotContextLabels {
  return {
    overallVerdictLabel: context.overallVerdict
      ? mapVerdictToDisplay(context.overallVerdict as OverallVerdict).label
      : null,
    confidenceTierLabel: lookupLabel(CONFIDENCE_TIER_LABEL, context.confidenceTier),
    limitingFactorLabel: lookupLabel(LIMITING_FACTOR_SYSTEM_LABEL, context.limitingFactorSystem),
    physicalHealthCapacityLabel: lookupLabel(CAPACITY_LABELS, context.physicalHealthCapacity),
    fatigueTrainingCapacityLabel: context.fatigueTrainingCapacity
      ? mapFatigueCapacityLabel(context.fatigueTrainingCapacity as TrainingCapacity)
      : null,
  };
}

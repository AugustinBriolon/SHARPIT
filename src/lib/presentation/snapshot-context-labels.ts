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

export function describeSnapshotContext(context: DecisionSnapshotContext): SnapshotContextLabels {
  return {
    overallVerdictLabel: context.overallVerdict
      ? mapVerdictToDisplay(context.overallVerdict as OverallVerdict).label
      : null,
    confidenceTierLabel: context.confidenceTier
      ? (CONFIDENCE_TIER_LABEL[context.confidenceTier] ?? context.confidenceTier)
      : null,
    limitingFactorLabel: context.limitingFactorSystem
      ? (LIMITING_FACTOR_SYSTEM_LABEL[context.limitingFactorSystem] ?? context.limitingFactorSystem)
      : null,
    // physicalHealthCapacity is a TrainingCapacityLevel (FULL/REDUCED/LIMITED/UNABLE),
    // not fatigue's TrainingCapacity (FULL/REDUCED/LIGHT_ONLY/REST_ONLY) — a different
    // enum with different values. Do not resolve it via mapFatigueCapacityLabel: LIMITED
    // and UNABLE aren't keys in that map, so it silently drops them.
    physicalHealthCapacityLabel: context.physicalHealthCapacity
      ? (CAPACITY_LABELS[context.physicalHealthCapacity] ?? context.physicalHealthCapacity)
      : null,
    fatigueTrainingCapacityLabel: context.fatigueTrainingCapacity
      ? mapFatigueCapacityLabel(context.fatigueTrainingCapacity as TrainingCapacity)
      : null,
  };
}

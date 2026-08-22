import type { SleepNightStatus } from '@/core/presentation/sleep-view-model';
import { formatDuration } from '@/lib/sleep/sleep';
import { formatSleepDuration } from '@/lib/sleep/sleep-scoring';

/**
 * Why tonight's plan says what it says.
 *
 * This reading used to be its own "Pourquoi" section, a paragraph explaining the
 * night that had just ended. On a screen read in the evening the useful form of
 * the same fact is the justification of the bedtime being proposed — so it moved
 * under the plan instead of standing beside it.
 *
 * Ordered by what actually drives tonight: a week of debt outranks a single short
 * night, which outranks a shallow one.
 */
export function tonightReason({
  nightStatus,
  debt7Min,
  targetDeltaMin,
  restorativeRatio,
  regularityMin,
}: {
  nightStatus: SleepNightStatus;
  debt7Min: number | null;
  targetDeltaMin: number | null;
  restorativeRatio: number | null;
  regularityMin: number | null;
}): string | null {
  if (nightStatus === 'pending') {
    return 'La nuit dernière n’est pas encore synchronisée — le plan s’appuie sur tes nuits précédentes.';
  }
  if (nightStatus === 'missing') {
    return 'Pas de données pour la nuit dernière — le plan s’appuie sur tes nuits précédentes.';
  }

  if (debt7Min != null && debt7Min > 30) {
    return `Dette de ${formatDuration(debt7Min)} sur 7 jours — à résorber sur les prochaines nuits.`;
  }
  if (targetDeltaMin != null && targetDeltaMin < 0) {
    return `${formatSleepDuration(Math.abs(targetDeltaMin))} sous l’objectif la nuit dernière.`;
  }
  if (restorativeRatio != null && restorativeRatio < 40) {
    return `Part restauratrice à ${restorativeRatio} % la nuit dernière — profond et paradoxal en retrait.`;
  }
  if (regularityMin != null) {
    return `Régularité ±${regularityMin} min autour de ton réveil habituel.`;
  }
  return null;
}

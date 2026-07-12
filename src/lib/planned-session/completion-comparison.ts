/**
 * Post-session comparison — planned vs observed environmental context.
 */

import type { ActivityEnvironmentalCorrection } from '@/core/environment';
import type {
  PlannedSessionCompletionComparison,
  PlannedSessionContext,
} from '@/core/planned-session/types';

const THERMAL_LABELS: Record<string, string> = {
  LOW: 'conditions fraîches',
  MODERATE: 'conditions modérées',
  HIGH: 'chaleur marquée',
  EXTREME: 'stress thermique élevé',
  UNKNOWN: 'conditions incertaines',
  NOT_APPLICABLE: 'intérieur',
};

export function buildPlannedSessionCompletionComparison(input: {
  plannedContext: PlannedSessionContext | null;
  observedCorrection: ActivityEnvironmentalCorrection | null;
  observedThermalLevel?: string | null;
  observedTrainingImpact?: string | null;
}): PlannedSessionCompletionComparison {
  const planned = input.plannedContext?.environment;
  const observedImpact = input.observedTrainingImpact ?? null;
  const plannedImpact = planned?.trainingImpact ?? null;

  if (!planned && !input.observedCorrection) {
    return {
      visible: false,
      plannedImpact: null,
      observedImpact: null,
      impactDeltaLabel: null,
      plannedThermalLabel: null,
      observedThermalLabel: null,
      narrativeLines: [],
    };
  }

  function resolveObservedThermalLabel(input: {
    observedThermalLevel?: string | null;
    observedCorrection?: { factors: readonly unknown[] } | null;
  }): string | null {
    if (input.observedThermalLevel) {
      return THERMAL_LABELS[input.observedThermalLevel] ?? input.observedThermalLevel;
    }
    if (input.observedCorrection?.factors.length) {
      return 'conditions contraignantes observées';
    }
    return null;
  }

  const plannedThermalLabel = planned ? (THERMAL_LABELS[planned.thermalStressLevel] ?? null) : null;
  const observedThermalLabel = resolveObservedThermalLabel(input);

  const narrativeLines: string[] = [];

  if (plannedThermalLabel && observedThermalLabel) {
    if (plannedThermalLabel === observedThermalLabel) {
      narrativeLines.push(
        `Les conditions observées correspondent à ce qui était attendu (${plannedThermalLabel}).`,
      );
    } else {
      narrativeLines.push(`Prévu : ${plannedThermalLabel}. Observé : ${observedThermalLabel}.`);
    }
  }

  if (input.observedCorrection?.narrative.length) {
    for (const item of input.observedCorrection.narrative.slice(0, 2)) {
      narrativeLines.push(item.code);
    }
  }

  if (plannedImpact && observedImpact && plannedImpact !== observedImpact) {
    narrativeLines.push(
      "L'impact environnemental réel diffère de la prévision — intègre-le dans l'interprétation de la séance.",
    );
  }

  let impactDeltaLabel: string | null = null;
  if (plannedImpact && observedImpact && plannedImpact !== observedImpact) {
    impactDeltaLabel = `${plannedImpact} → ${observedImpact}`;
  }

  return {
    visible: narrativeLines.length > 0,
    plannedImpact: plannedImpact ?? null,
    observedImpact:
      (observedImpact as PlannedSessionCompletionComparison['observedImpact']) ?? null,
    impactDeltaLabel,
    plannedThermalLabel,
    observedThermalLabel,
    narrativeLines,
  };
}

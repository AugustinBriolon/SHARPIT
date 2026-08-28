/**
 * Post-session comparison — planned vs observed environmental context.
 */

import type { ActivityEnvironmentalCorrection } from '@/core/environment';
import { isSet } from '@/lib/util/value';
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

function emptyComparison(): PlannedSessionCompletionComparison {
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

function appendThermalNarrative(
  lines: string[],
  plannedThermalLabel: string | null,
  observedThermalLabel: string | null,
): void {
  if (!plannedThermalLabel || !observedThermalLabel) {
    return;
  }
  if (plannedThermalLabel === observedThermalLabel) {
    lines.push(
      `Les conditions observées correspondent à ce qui était attendu (${plannedThermalLabel}).`,
    );
    return;
  }
  lines.push(`Prévu : ${plannedThermalLabel}. Observé : ${observedThermalLabel}.`);
}

function appendCorrectionNarrative(
  lines: string[],
  correction: ActivityEnvironmentalCorrection | null,
): void {
  if (!correction?.narrative.length) {
    return;
  }
  for (const item of correction.narrative.slice(0, 2)) {
    lines.push(item.code);
  }
}

function buildCompletionNarrative(input: {
  plannedThermalLabel: string | null;
  observedThermalLabel: string | null;
  observedCorrection: ActivityEnvironmentalCorrection | null;
  impactDiffers: boolean;
}): string[] {
  const narrativeLines: string[] = [];
  appendThermalNarrative(narrativeLines, input.plannedThermalLabel, input.observedThermalLabel);
  appendCorrectionNarrative(narrativeLines, input.observedCorrection);
  if (input.impactDiffers) {
    narrativeLines.push(
      "L'impact environnemental réel diffère de la prévision — intègre-le dans l'interprétation de la séance.",
    );
  }
  return narrativeLines;
}

function plannedThermalLabelFrom(
  planned: PlannedSessionContext['environment'] | null | undefined,
): string | null {
  if (!planned) {
    return null;
  }
  return THERMAL_LABELS[planned.thermalStressLevel] ?? null;
}

function impactDeltaLabel(
  plannedImpact: string | null,
  observedImpact: string | null,
): string | null {
  if (!plannedImpact || !observedImpact || plannedImpact === observedImpact) {
    return null;
  }
  return `${plannedImpact} → ${observedImpact}`;
}

function buildComparisonResult(input: {
  plannedImpact: string | null;
  observedImpact: string | null;
  plannedThermalLabel: string | null;
  observedThermalLabel: string | null;
  narrativeLines: string[];
  impactDeltaLabel: string | null;
}): PlannedSessionCompletionComparison {
  return {
    visible: input.narrativeLines.length > 0,
    plannedImpact: input.plannedImpact as PlannedSessionCompletionComparison['plannedImpact'],
    observedImpact:
      (input.observedImpact as PlannedSessionCompletionComparison['observedImpact']) ?? null,
    impactDeltaLabel: input.impactDeltaLabel,
    plannedThermalLabel: input.plannedThermalLabel,
    observedThermalLabel: input.observedThermalLabel,
    narrativeLines: input.narrativeLines,
  };
}

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
    return emptyComparison();
  }

  const plannedThermalLabel = plannedThermalLabelFrom(planned);
  const observedThermalLabel = resolveObservedThermalLabel(input);
  const deltaLabel = impactDeltaLabel(plannedImpact, observedImpact);

  return buildComparisonResult({
    plannedImpact: plannedImpact ?? null,
    observedImpact,
    plannedThermalLabel,
    observedThermalLabel,
    impactDeltaLabel: deltaLabel,
    narrativeLines: buildCompletionNarrative({
      plannedThermalLabel,
      observedThermalLabel,
      observedCorrection: input.observedCorrection,
      impactDiffers: isSet(deltaLabel),
    }),
  });
}

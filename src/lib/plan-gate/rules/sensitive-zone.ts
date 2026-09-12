import { resolveStrengthSetMedia } from '@/lib/exercises/resolve';
import {
  exerciseZoneConflict,
  sensitiveZonesFrom,
  type SensitiveZone,
} from '@/lib/physical-health/sensitive-zones';
import type { GateContext, GateProposal, PlanGateRule, RuleFinding } from '../types';

type FlaggedExercise = { exercise: string; zone: SensitiveZone };

function flaggedExercises(
  proposal: GateProposal,
  zones: readonly SensitiveZone[],
): FlaggedExercise[] {
  const sets = proposal.strengthPrescription?.sets ?? [];
  return sets.flatMap((set) => {
    // The model's own prescription carries no catalog id; a persisted one does.
    const catalogId = (set as { exerciseCatalogId?: string | null }).exerciseCatalogId ?? null;
    const media = resolveStrengthSetMedia({
      exercise: set.exercise,
      exerciseCatalogId: catalogId,
    });
    const zone = exerciseZoneConflict(media?.bodyPart, zones);
    return zone ? [{ exercise: set.exercise, zone }] : [];
  });
}

function describe(flagged: readonly FlaggedExercise[]): string {
  const zoneLabels = [...new Set(flagged.map((item) => item.zone.label))].join(', ');
  const exercises = [...new Set(flagged.map((item) => item.exercise))].join(', ');
  return `Cette séance charge une zone que l'athlète protège (${zoneLabels}) : ${exercises}. Renforce autour de la zone plutôt que dessus, ou remplace ces exercices.`;
}

/**
 * A strength session must not load a zone the athlete is protecting.
 *
 * The prompt says never to aggravate a sensitive zone and the context names the
 * zones, but nothing checked the exercises that came back. The catalog knows
 * which body group each exercise loads, so the mismatch is verifiable rather
 * than a matter of the model's attention (volet C).
 *
 * A warning, never a rejection: the mapping from a French body region to the
 * catalog's coarse groups is deliberately broad, and prehab work around an
 * injury legitimately targets the same group.
 */
export const sensitiveZoneRule: PlanGateRule = (
  context: GateContext,
  proposal: GateProposal,
): RuleFinding[] => {
  if (proposal.type !== 'STRENGTH' || !proposal.strengthPrescription) {
    return [];
  }

  const zones = sensitiveZonesFrom(context.physicalHealth?.conditions);
  if (zones.length === 0) {
    return [];
  }

  const flagged = flaggedExercises(proposal, zones);
  if (flagged.length === 0) {
    return [];
  }

  return [
    {
      ruleCode: 'SENSITIVE_ZONE_LOADED',
      severity: 'WARNING',
      rationale: describe(flagged),
      evidenceRefs: ['physicalHealth.conditions', 'proposal.strengthPrescription'],
    },
  ];
};

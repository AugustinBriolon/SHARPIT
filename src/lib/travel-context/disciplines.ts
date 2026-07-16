import type { ActivityType } from '@prisma/client';
import type { TravelTrainingConstraint } from '@/lib/travel-context/training-constraint';

/** Disciplines an athlete can realistically train during a travel window. */
export type TravelDiscipline = 'RUN' | 'BIKE' | 'SWIM' | 'STRENGTH' | 'MOBILITY';

export const TRAVEL_DISCIPLINES: readonly TravelDiscipline[] = [
  'RUN',
  'BIKE',
  'SWIM',
  'STRENGTH',
  'MOBILITY',
] as const;

export const TRAVEL_DISCIPLINE_LABELS: Record<TravelDiscipline, string> = {
  RUN: 'Course',
  BIKE: 'Vélo',
  SWIM: 'Natation',
  STRENGTH: 'Musculation / renfo',
  MOBILITY: 'Mobilité / étirements',
};

const ENDURANCE: ReadonlySet<TravelDiscipline> = new Set(['RUN', 'BIKE', 'SWIM']);

export function isTravelDiscipline(value: unknown): value is TravelDiscipline {
  return (
    value === 'RUN' ||
    value === 'BIKE' ||
    value === 'SWIM' ||
    value === 'STRENGTH' ||
    value === 'MOBILITY'
  );
}

export function normalizeTravelDisciplines(values: unknown): TravelDiscipline[] {
  if (!Array.isArray(values)) return [];
  const unique = new Set<TravelDiscipline>();
  for (const value of values) {
    if (isTravelDiscipline(value)) unique.add(value);
  }
  return TRAVEL_DISCIPLINES.filter((d) => unique.has(d));
}

/**
 * Derive macro load constraint from selected sports.
 * - empty → FULL (no restriction declared)
 * - mobility only → MOBILITY_ONLY
 * - strength ± mobility, no endurance → REDUCED
 * - at least one endurance sport → FULL (still filters session types in weekly fill)
 */
export function deriveTravelTrainingConstraint(
  disciplines: readonly TravelDiscipline[],
  opts?: { noStructuredTraining?: boolean },
): TravelTrainingConstraint {
  if (opts?.noStructuredTraining) return 'NONE';
  if (disciplines.length === 0) return 'FULL';
  if (disciplines.every((d) => d === 'MOBILITY')) return 'MOBILITY_ONLY';
  const hasEndurance = disciplines.some((d) => ENDURANCE.has(d));
  if (!hasEndurance) return 'REDUCED';
  return 'FULL';
}

export function travelDisciplineLabels(disciplines: readonly TravelDiscipline[]): string[] {
  return disciplines.map((d) => TRAVEL_DISCIPLINE_LABELS[d]);
}

/** Map planned ActivityType to travel discipline filter (MOBILITY has no ActivityType). */
export function activityTypeToTravelDiscipline(type: ActivityType): TravelDiscipline | null {
  switch (type) {
    case 'RUN':
      return 'RUN';
    case 'BIKE':
      return 'BIKE';
    case 'SWIM':
      return 'SWIM';
    case 'STRENGTH':
      return 'STRENGTH';
    default:
      return null;
  }
}

export function formatAllowedDisciplinesPromptRule(
  disciplines: readonly TravelDiscipline[],
): string {
  if (disciplines.length === 0) return '';
  const labels = travelDisciplineLabels(disciplines).join(', ');
  const onlyMobility = disciplines.every((d) => d === 'MOBILITY');
  if (onlyMobility) {
    return `SPORTS AUTORISÉS PENDANT LE VOYAGE : ${labels} uniquement. Aucune séance course / vélo / natation / renfo structuré.`;
  }
  return `SPORTS AUTORISÉS PENDANT LE VOYAGE : ${labels} uniquement. Ne propose aucun autre type de séance.`;
}

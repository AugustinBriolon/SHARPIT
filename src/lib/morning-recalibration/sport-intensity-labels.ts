import type { ActivityType, SessionIntensity } from '@prisma/client';
import { intensityLabels } from '@/lib/planned-session/sessions';

/** Endurance ladder language — RUN / BIKE / SWIM / TRIATHLON. */
const ENDURANCE_SPORTS = new Set<string>(['RUN', 'BIKE', 'SWIM', 'TRIATHLON']);

/** Strength / neutral effort language mapped onto the shared SessionIntensity enum. */
const STRENGTH_INTENSITY_LABELS: Record<SessionIntensity, string> = {
  RECOVERY: 'Récupération',
  ENDURANCE: 'Léger',
  TEMPO: 'Modéré',
  THRESHOLD: 'Exigeant',
  VO2MAX: 'Intensif',
  RACE: 'Max',
};

export function isEnduranceMorningSport(type: ActivityType | string): boolean {
  return ENDURANCE_SPORTS.has(type);
}

export function isStrengthLikeMorningSport(type: ActivityType | string): boolean {
  return type === 'STRENGTH' || type === 'OTHER';
}

/** Display label for morning proposal UI — sport-aware wording on the shared enum. */
export function morningIntensityLabel(
  type: ActivityType | string,
  intensity: string | null | undefined,
): string | null {
  if (!intensity) return null;
  if (intensity in intensityLabels) {
    const key = intensity as SessionIntensity;
    if (isStrengthLikeMorningSport(type)) return STRENGTH_INTENSITY_LABELS[key];
    return intensityLabels[key];
  }
  return intensity;
}

import type { ActivityType } from '@prisma/client';
import { isStrengthLikeMorningSport } from '@/lib/morning-recalibration/sport-intensity-labels';

export type DescriptionAdaptDirection = 'DOWN' | 'UP';

const LOADED_PHRASE =
  /\b(exercices?\s+lestés?(?:\s+\S+)*)\b|\b(charges?\s+(?:lourdes?|modérées?|élevées?))\b|\b(travail\s+lesté)\b/gi;

/**
 * Deterministic structure rewrite for free-text planned-session descriptions.
 * Strength: ease removes heavy loading language; push keeps structure with a light progression note.
 * Endurance: leave text unchanged (zones live in intensity/load — no inventing intervals).
 */
export function adaptMorningSessionDescription(input: {
  type: ActivityType;
  description: string | null | undefined;
  direction: DescriptionAdaptDirection;
}): string | null {
  const raw = input.description?.trim() || null;
  if (!isStrengthLikeMorningSport(input.type)) {
    return raw;
  }

  if (input.direction === 'DOWN') {
    return easeStrengthDescription(raw);
  }
  return pushStrengthDescription(raw);
}

function easeStrengthDescription(raw: string | null): string {
  if (!raw) {
    return [
      'Version allégée :',
      '1. Mobilité et activation douce.',
      '2. Travail technique au poids du corps (ou charge minimale).',
      '3. Pas de séries lourdes — priorité qualité du mouvement.',
    ].join(' ');
  }

  let next = raw;
  next = next.replace(LOADED_PHRASE, (_match, loadedExercise, heavyLoad, loadedWork) => {
    if (loadedExercise) {
      return 'activation musculaire sans charge lourde (poids du corps ou charge très légère)';
    }
    if (heavyLoad) return 'charge légère / technique';
    if (loadedWork) return 'travail technique léger';
    return 'activation sans charge lourde';
  });
  next = next.replace(/\blestés?\b/gi, 'légers / au poids du corps');
  next = next.replace(/\blourds?\b/gi, 'légers');

  if (!/version allégée/i.test(next)) {
    next = `Version allégée — ${next}`;
  }

  return next.replace(/\s{2,}/g, ' ').trim();
}

function pushStrengthDescription(raw: string | null): string {
  if (!raw) {
    return [
      'Version un cran plus exigeante :',
      '1. Mobilité courte.',
      '2. Travail principal avec progression légère de charge si la technique est propre.',
      '3. Pas de max — qualité avant quantité.',
    ].join(' ');
  }

  if (/progression légère|un cran plus|charge si la technique/i.test(raw)) {
    return raw;
  }

  return `${raw.replace(/\s+$/, '')} — progression légère de charge uniquement si la technique reste propre.`;
}

/**
 * Pure parse / seed helpers for morning wellness hydrate (edit open).
 * Domain scores match SUBJECTIVE MANUAL observations without sessionExternalId.
 */

import {
  mapSorenessDomainToUi,
  type WellnessUiScore,
  WELLNESS_UI_SCALE,
} from '@sharpit/app/lib/journal/morning-wellness-scale';

export type MorningWellnessEntry = {
  mood: number;
  energyLevel: number;
  perceivedSoreness: number;
  stressLevel: number;
  notes: string | null;
};

/** UI-ready seed for the modal form (soreness already mapped 0–10 → 1–5). */
export type MorningWellnessFormSeed = {
  mood: WellnessUiScore;
  energyLevel: WellnessUiScore;
  perceivedSoreness: WellnessUiScore;
  stressLevel: WellnessUiScore;
  notes: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIntInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}

function isWellnessUiScore(value: unknown): value is WellnessUiScore {
  return isIntInRange(value, 1, 5) && (WELLNESS_UI_SCALE as readonly number[]).includes(value);
}

/**
 * Returns a morning check-in entry when `data` is a non-session SUBJECTIVE payload
 * with all four wellness scales present. Incomplete or session-linked rows → null.
 */
export function parseMorningWellnessEntry(data: unknown): MorningWellnessEntry | null {
  if (!isRecord(data)) {
    return null;
  }
  if (data.sessionExternalId) {
    return null;
  }
  if (
    !isWellnessUiScore(data.mood) ||
    !isWellnessUiScore(data.energyLevel) ||
    !isIntInRange(data.perceivedSoreness, 0, 10) ||
    !isWellnessUiScore(data.stressLevel)
  ) {
    return null;
  }

  const notes =
    typeof data.notes === 'string' && data.notes.trim().length > 0 ? data.notes.trim() : null;

  return {
    mood: data.mood,
    energyLevel: data.energyLevel,
    perceivedSoreness: data.perceivedSoreness,
    stressLevel: data.stressLevel,
    notes,
  };
}

/** Maps a saved domain entry onto ScalePicker values, or null when nothing to hydrate. */
export function seedMorningWellnessForm(
  entry: MorningWellnessEntry | null | undefined,
): MorningWellnessFormSeed | null {
  if (!entry) {
    return null;
  }
  if (
    !isWellnessUiScore(entry.mood) ||
    !isWellnessUiScore(entry.energyLevel) ||
    !isWellnessUiScore(entry.stressLevel) ||
    !isIntInRange(entry.perceivedSoreness, 0, 10)
  ) {
    return null;
  }

  return {
    mood: entry.mood,
    energyLevel: entry.energyLevel,
    perceivedSoreness: mapSorenessDomainToUi(entry.perceivedSoreness),
    stressLevel: entry.stressLevel,
    notes: entry.notes ?? '',
  };
}

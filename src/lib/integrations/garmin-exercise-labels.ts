import { humanizeExercise } from '@/lib/integrations/garmin-exercise-humanize';

const GARMIN_FR_LABELS_URL =
  'https://connect.garmin.com/web-translations/exercise_types/exercise_types_fr.properties';

let cachedLabels: Map<string, string> | null = null;

function parsePropertiesFile(text: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    map.set(trimmed.slice(0, eq), trimmed.slice(eq + 1));
  }
  return map;
}

export async function ensureGarminExerciseLabelsFr(): Promise<Map<string, string>> {
  if (cachedLabels) return cachedLabels;
  try {
    const response = await fetch(GARMIN_FR_LABELS_URL, { next: { revalidate: 60 * 60 * 24 } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    cachedLabels = parsePropertiesFile(await response.text());
  } catch (error) {
    console.warn('[Garmin] French exercise labels fetch failed, using fallbacks:', error);
    cachedLabels = new Map();
  }
  return cachedLabels;
}

export function setGarminExerciseLabelsForTests(labels: Map<string, string> | null): void {
  cachedLabels = labels;
}

export function resolveGarminExerciseLabel(
  category: string | null | undefined,
  name: string | null | undefined,
  labels: Map<string, string>,
): string {
  const cat = category?.trim();
  const sub = name?.trim();

  if (sub) {
    const subLabel = labels.get(`exercise_type_${sub}`);
    if (subLabel) return subLabel;
    if (sub.toUpperCase() === 'UNKNOWN') return 'Inconnu';
  }

  if (cat) {
    const catLabel = labels.get(`exercise_type_${cat}`);
    if (catLabel) return catLabel;
    if (cat.toUpperCase() === 'UNKNOWN') return 'Inconnu';
  }

  const raw = sub || cat;
  if (!raw) return 'Exercice';
  if (raw.toUpperCase() === 'UNKNOWN') return 'Inconnu';
  return humanizeExercise(raw);
}

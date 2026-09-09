export const JOURNAL_AUTO_ITEM_IDS = [
  'steps_10k',
  'stress_ok',
  'nap',
  'sun',
  'cardio_20',
  'strength_20',
  'sleep_target',
  'body_battery_ok',
  'hydration_sync',
  'outdoor_minutes',
] as const;

export type JournalAutoItemId = (typeof JOURNAL_AUTO_ITEM_IDS)[number];

export const JOURNAL_AUTO_ITEM_LABELS: Record<JournalAutoItemId, string> = {
  steps_10k: 'Pas (objectif)',
  stress_ok: 'Stress sous cible',
  nap: 'Sieste',
  sun: 'Soleil (auto)',
  cardio_20: 'Cardio',
  strength_20: 'Force',
  sleep_target: 'Sommeil ≥ cible',
  body_battery_ok: 'Body Battery',
  hydration_sync: 'Hydratation (sync)',
  outdoor_minutes: 'Temps outdoor',
};

export function isJournalAutoItemId(value: string): value is JournalAutoItemId {
  return (JOURNAL_AUTO_ITEM_IDS as readonly string[]).includes(value);
}

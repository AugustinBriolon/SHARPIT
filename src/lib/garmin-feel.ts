/** RPE Garmin (directWorkoutRpe) : entier 10–100, échelle 1–10. */
export function garminRpeToScale(raw: number | null | undefined): number | null {
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return null;
  const scaled = raw > 10 ? Math.round(raw / 10) : Math.round(raw);
  return Math.min(10, Math.max(1, scaled));
}

/**
 * Ressenti Garmin (directWorkoutFeel) : 0 / 25 / 50 / 75 / 100.
 * Libellés alignés sur l'app Garmin Connect.
 */
export function garminFeelLabel(raw: number | null | undefined): string | null {
  if (raw == null || !Number.isFinite(raw)) return null;
  if (raw <= 12) return 'Très mal';
  if (raw <= 37) return 'Mal';
  if (raw <= 62) return 'Correct';
  if (raw <= 87) return 'Bien';
  return 'Très bien';
}

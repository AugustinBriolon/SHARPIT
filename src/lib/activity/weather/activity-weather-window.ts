/** Fenêtre temporelle d'une activité (duration = secondes, comme partout dans le modèle Activity). */
export function activityWeatherWindow(
  date: Date,
  durationSec: number | null,
): { start: Date; end: Date } {
  const start = new Date(date);
  const durationMs = (durationSec ?? 3600) * 1000;
  return { start, end: new Date(start.getTime() + durationMs) };
}

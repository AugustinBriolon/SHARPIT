/**
 * Race goal display name — derived from format + target, never typed by the athlete
 * during onboarding. Progression still lets them rename.
 */

export function buildRaceTitle(
  raceFormat: string | null,
  targetPerformance: string | null,
): string {
  const parts = [raceFormat?.trim(), targetPerformance?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Course';
}

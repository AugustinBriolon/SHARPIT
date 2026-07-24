/** Normalize exercise labels for catalog matching (EN + FR Garmin). */
export function normalizeExerciseKey(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function exerciseTokens(raw: string): string[] {
  return normalizeExerciseKey(raw)
    .split(' ')
    .filter((t) => t.length > 1);
}

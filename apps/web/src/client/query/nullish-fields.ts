/** Map optional payload fields to null without per-field ?? complexity. */
export function nullishFields<T extends Record<string, unknown>, K extends keyof T>(
  source: T,
  keys: readonly K[],
): { [P in K]: T[P] | null } {
  const out = {} as { [P in K]: T[P] | null };
  for (const key of keys) {
    out[key] = (source[key] ?? null) as T[K] | null;
  }
  return out;
}

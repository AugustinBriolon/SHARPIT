/** True when value is neither null nor undefined (eqeqeq-safe). */
export function isSet<T>(value: T | null | undefined): value is T {
  return value !== undefined && value !== null;
}

/** Format a nullable value or return null for filter(Boolean) pipelines. */
export function formatStatBit<T>(
  value: T | null | undefined,
  formatter: (v: T) => string,
): string | null {
  return isSet(value) ? formatter(value) : null;
}

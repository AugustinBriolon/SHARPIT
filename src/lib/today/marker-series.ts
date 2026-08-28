/**
 * Reading a marker against its own recent history.
 *
 * Pure so the page and its tests agree on what "−15 vs 7j" means, and so the
 * arithmetic is not re-derived slightly differently in each block that shows it.
 */

/** Change between the latest value and the mean of the seven before it. */
export function deltaVsTrailingWeek(series: (number | null)[]): number | null {
  const valid = series.filter((value): value is number => (value !== undefined && value !== null));
  if (valid.length < 8) {
    return null;
  }

  const last = valid[valid.length - 1];
  const previous = valid.slice(-8, -1);
  const mean = previous.reduce((sum, value) => sum + value, 0) / previous.length;
  return Math.round((last - mean) * 10) / 10;
}

/**
 * The span actually observed over the series.
 *
 * Not a physiological norm — callers must label it for what it is, or an
 * observed fortnight starts passing for a baseline.
 */
export function observedRange(series: (number | null)[]): { low: number; high: number } | null {
  const valid = series.filter((value): value is number => (value !== undefined && value !== null));
  if (valid.length < 3) {
    return null;
  }

  const low = Math.min(...valid);
  const high = Math.max(...valid);
  if (low === high) {
    return null;
  }
  return { low: Math.round(low), high: Math.round(high) };
}

/**
 * Relative pace bar width for rhythm splits (0–100).
 * Faster pace (lower sec/km) → longer bar. Inverse of pace magnitude.
 */
export function splitPaceBarPercent(
  paceSecPerKm: number | null,
  minPace: number | null,
  maxPace: number | null,
): number {
  if (paceSecPerKm === null || minPace === null || maxPace === null) {
    return 0;
  }
  if (maxPace <= minPace) {
    return 100;
  }
  // Invert: best (min) = 100%, slowest (max) = ~28% so the bar never vanishes.
  const t = (paceSecPerKm - minPace) / (maxPace - minPace);
  return Math.round(100 - t * 72);
}

export function formatSplitDeltaAccessible(delta: { pct: number; faster: boolean }): string {
  const direction = delta.faster ? 'plus rapide' : 'plus lent';
  return `${delta.faster ? '−' : '+'}${delta.pct.toFixed(0)} % (${direction})`;
}

import type { MarkerHistoryPoint } from '@/components/today/drill-down/marker-history-chart';

const VIEW_W = 200;
const VIEW_H = 56;
const PAD = 2;

/** Nearest readable point to `from`, so hovering a gap still reads something. */
export function nearestReadable(points: MarkerHistoryPoint[], from: number): number | null {
  for (let offset = 0; offset < points.length; offset += 1) {
    const before = from - offset;
    const after = from + offset;
    if (before >= 0 && points[before]?.value !== null) {
      return before;
    }
    if (after < points.length && points[after]?.value !== null) {
      return after;
    }
  }
  return null;
}

export function positionOfIndex(index: number, count: number): number {
  if (count <= 1) {
    return 50;
  }
  return ((PAD + (index / (count - 1)) * (VIEW_W - PAD * 2)) / VIEW_W) * 100;
}

export function verticalOfValue(value: number, low: number, high: number): number {
  const span = high - low || 1;
  return ((VIEW_H - PAD - ((value - low) / span) * (VIEW_H - PAD * 2)) / VIEW_H) * 100;
}

export const MARKER_HISTORY_VIEW = { VIEW_W, VIEW_H };

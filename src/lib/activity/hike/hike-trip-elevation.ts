import type { HikeTripMemberInput } from '@/lib/activity/hike/hike-trip-summary';
import { isSet } from '@/lib/util/value';

/**
 * Relative elevation profile for a hike trip.
 *
 * The trip query carries per-step totals (D+ / D−) only — no altitude stream —
 * so the curve is a *cumulative relative gain* sawtooth (one tooth per step),
 * never an absolute altitude. Labels must stay relative for that reason:
 * claiming absolute altitude here would be invented precision.
 */
export type HikeTripElevationPoint = {
  x: number;
  /** Cumulative relative gain in metres, starting at 0. */
  gain: number;
  stepIndex: number;
};

export type HikeTripElevationProfile = {
  points: HikeTripElevationPoint[];
  minGain: number;
  maxGain: number;
  /** x of the highest point — the trip's culminating step. */
  peakX: number;
  peakGain: number;
  /** x of each step end, used to draw the junctions between steps. */
  stepBoundaries: number[];
};

function asTime(value: Date | string): number {
  return (value instanceof Date ? value : new Date(value)).getTime();
}

function positive(value: number | null | undefined): number {
  return isSet(value) && Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Builds the sawtooth: each step rises by its D+ then drops by its D−.
 * A step with an unknown D− simply does not descend — we never invent a loss.
 * Returns `null` when no step carries any elevation gain (card is hidden).
 */
export function buildHikeTripElevationProfile(
  members: HikeTripMemberInput[],
): HikeTripElevationProfile | null {
  if (members.length === 0) {
    return null;
  }

  const ordered = [...members].sort((a, b) => asTime(a.date) - asTime(b.date));
  const totalGain = ordered.reduce((sum, m) => sum + positive(m.hikeMetrics?.elevationM), 0);
  if (totalGain <= 0) {
    return null;
  }

  const points: HikeTripElevationPoint[] = [{ x: 0, gain: 0, stepIndex: 0 }];
  const stepBoundaries: number[] = [];
  let current = 0;

  ordered.forEach((member, stepIndex) => {
    const gain = positive(member.hikeMetrics?.elevationM);
    const loss = positive(member.hikeMetrics?.elevationLossM);

    current += gain;
    points.push({ x: stepIndex * 2 + 1, gain: current, stepIndex });

    current -= loss;
    const endX = stepIndex * 2 + 2;
    points.push({ x: endX, gain: current, stepIndex });
    if (stepIndex < ordered.length - 1) {
      stepBoundaries.push(endX);
    }
  });

  let [peak] = points;
  for (const point of points) {
    if (point.gain > peak.gain) {
      peak = point;
    }
  }

  return {
    points,
    minGain: Math.min(...points.map((p) => p.gain)),
    maxGain: peak.gain,
    peakX: peak.x,
    peakGain: peak.gain,
    stepBoundaries,
  };
}

/**
 * Three-point sparkline for a single step: start → peak → end.
 * Returns `null` when the step has no recorded gain.
 */
export function buildHikeStepSparkline(
  member: Pick<HikeTripMemberInput, 'hikeMetrics'>,
): { x: number; gain: number }[] | null {
  const gain = positive(member.hikeMetrics?.elevationM);
  if (gain <= 0) {
    return null;
  }

  const loss = positive(member.hikeMetrics?.elevationLossM);
  return [
    { x: 0, gain: 0 },
    { x: 1, gain },
    { x: 2, gain: gain - loss },
  ];
}

/** Relative gain reading — always signed so it cannot be read as an altitude. */
export function formatRelativeGain(meters: number): string {
  const rounded = Math.round(meters);
  return `${rounded >= 0 ? '+' : '−'}${Math.abs(rounded)} m`;
}

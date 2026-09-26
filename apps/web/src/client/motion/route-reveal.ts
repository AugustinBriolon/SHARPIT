/**
 * Pure math behind the route reveal (ADR-024) — how many of the route's
 * already-known points are visible at a given moment of the animation.
 *
 * Kept separate from `MapRoute` because the reveal runs inside a MapLibre
 * effect (no DOM/WebGL in the test environment) — this is the part of it
 * that can actually be unit-tested.
 */

/** Shortest reveal — still long enough to read as a trace, not a pop. */
export const REVEAL_DURATION_MIN_MS = 3000;

/** Longest reveal — enough to follow a dense GPS path without dragging. */
export const REVEAL_DURATION_MAX_MS = 5000;

/** At or below this many points, use the minimum duration. */
const SHORT_ROUTE_POINTS = 80;

/** At or above this many points, use the maximum duration. */
const LONG_ROUTE_POINTS = 800;

/**
 * How long the reveal should run for a route of `totalPoints` samples.
 * Short jogs stay near 3s; long rides stretch toward 5s so the line stays
 * watchable either way.
 */
export function revealDurationMs(totalPoints: number): number {
  if (totalPoints <= SHORT_ROUTE_POINTS) {
    return REVEAL_DURATION_MIN_MS;
  }
  if (totalPoints >= LONG_ROUTE_POINTS) {
    return REVEAL_DURATION_MAX_MS;
  }
  const t = (totalPoints - SHORT_ROUTE_POINTS) / (LONG_ROUTE_POINTS - SHORT_ROUTE_POINTS);
  return Math.round(REVEAL_DURATION_MIN_MS + t * (REVEAL_DURATION_MAX_MS - REVEAL_DURATION_MIN_MS));
}

/** Ease-out cubic — starts fast, settles into the finish. */
export function easeOutCubic(progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  return 1 - (1 - clamped) ** 3;
}

/**
 * How many leading points of `totalPoints` should be visible `elapsedMs`
 * into a `durationMs` reveal. Always at least 2 (a line needs two points)
 * once there is a line to draw at all, and exactly `totalPoints` once the
 * duration has elapsed — the animation's own last frame is the same call
 * the non-animated path makes.
 */
export function revealedPointCount(
  elapsedMs: number,
  durationMs: number,
  totalPoints: number,
): number {
  if (totalPoints < 2) {
    return totalPoints;
  }

  const progress = durationMs <= 0 ? 1 : elapsedMs / durationMs;
  const eased = easeOutCubic(progress);
  return Math.max(2, Math.min(totalPoints, Math.ceil(eased * totalPoints)));
}

/** True once `elapsedMs` has reached or passed the reveal's duration. */
export function isRevealComplete(elapsedMs: number, durationMs: number): boolean {
  return elapsedMs >= durationMs;
}

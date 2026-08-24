/**
 * Pure math behind the route reveal (ADR-024) — how many of the route's
 * already-known points are visible at a given moment of the animation.
 *
 * Kept separate from `MapRoute` because the reveal runs inside a MapLibre
 * effect (no DOM/WebGL in the test environment) — this is the part of it
 * that can actually be unit-tested.
 */

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
  if (totalPoints < 2) return totalPoints;

  const progress = durationMs <= 0 ? 1 : elapsedMs / durationMs;
  const eased = easeOutCubic(progress);
  return Math.max(2, Math.min(totalPoints, Math.ceil(eased * totalPoints)));
}

/** True once `elapsedMs` has reached or passed the reveal's duration. */
export function isRevealComplete(elapsedMs: number, durationMs: number): boolean {
  return elapsedMs >= durationMs;
}

/**
 * When a route reveal (ADR-024) is allowed to start based on how much of the
 * map container is actually on-screen.
 *
 * Kept pure so the IntersectionObserver threshold in `Map` can be unit-tested
 * without MapLibre/WebGL.
 */

/** Min fraction of the map that must be visible before the reveal starts. */
export const ROUTE_REVEAL_VISIBILITY_RATIO = 0.45;

/**
 * True once enough of the map is in the viewport that the athlete can watch
 * the draw. A lower gate (e.g. 0.2) starts the 3–5s reveal on a mere peek —
 * by the time they scroll fully onto the map, the line is already complete.
 */
export function shouldStartRouteReveal(intersectionRatio: number): boolean {
  return intersectionRatio >= ROUTE_REVEAL_VISIBILITY_RATIO;
}

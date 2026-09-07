/**
 * Stick-to-bottom policy for the coach chat transcript.
 *
 * A streamed answer grows the scroll height on every token. Following the tail
 * unconditionally makes the transcript unreadable: the athlete cannot scroll up
 * to re-read the reasoning while the coach is still writing. These helpers
 * decide when following the tail is still what the athlete wants.
 *
 * Pure geometry — no DOM, no React — so the policy is testable on its own.
 */

export type ScrollGeometry = {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};

/**
 * Distance in px from the bottom edge under which the transcript counts as
 * "at the bottom". Wide enough to absorb sub-pixel rounding and the last line's
 * leading, narrow enough that a deliberate scroll up disengages immediately.
 */
export const STICK_TO_BOTTOM_THRESHOLD_PX = 64;

/** How far the tail is from the viewport bottom. Never negative (overscroll). */
export function distanceFromBottom(geometry: ScrollGeometry): number {
  const distance = geometry.scrollHeight - geometry.scrollTop - geometry.clientHeight;
  return distance > 0 ? distance : 0;
}

/** True while the athlete is parked close enough to the tail to keep following it. */
export function isNearBottom(
  geometry: ScrollGeometry,
  threshold: number = STICK_TO_BOTTOM_THRESHOLD_PX,
): boolean {
  return distanceFromBottom(geometry) <= threshold;
}

/**
 * Whether to offer the "jump to latest" affordance.
 *
 * Shown only when the athlete has scrolled away *and* there is something to come
 * back to — during streaming, or once an answer they have not scrolled back to
 * has landed. Hiding it while stuck avoids a control that does nothing.
 */
export function shouldShowJumpToLatest(input: { stuck: boolean; hasMessages: boolean }): boolean {
  return !input.stuck && input.hasMessages;
}

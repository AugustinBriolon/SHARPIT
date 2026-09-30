import type { CoachMappedRow } from '@/components/coach/beui/coach-message-mapper';

/**
 * The transcript split where the turn under way begins — at the last question. The turn under
 * way fills at least the screen, so a question just sent can rise to its top while the answer
 * unrolls below it, the view never moving on its own.
 */
export function splitCurrentTurn(rows: readonly CoachMappedRow[]): {
  earlier: CoachMappedRow[];
  current: CoachMappedRow[];
} {
  const lastQuestion = rows.findLastIndex((row) => row.kind === 'user');
  if (lastQuestion === -1) {
    return { earlier: [...rows], current: [] };
  }
  return { earlier: rows.slice(0, lastQuestion), current: rows.slice(lastQuestion) };
}

/** The element the turn under way renders into, which a question just sent scrolls to. */
export const COACH_CURRENT_TURN_SLOT = 'coach-current-turn';

/**
 * Scroll offset that puts `target` at the top of `viewport`, `gap` pixels below its edge.
 * Pure geometry, so it holds whatever the element's offset parent is.
 */
export function scrollTopToReveal(
  viewport: { scrollTop: number; getBoundingClientRect: () => { top: number } },
  target: { getBoundingClientRect: () => { top: number } },
  gap = 8,
): number {
  return Math.max(
    0,
    viewport.scrollTop +
      target.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top -
      gap,
  );
}

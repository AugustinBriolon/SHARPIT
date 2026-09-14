/**
 * Pure helpers for the post-session pain reassessment pager.
 * Index clamp stays out of React so named-step / swipe controls stay testable.
 */

export function clampReassessmentIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return Math.min(length - 1, Math.max(0, Math.floor(index)));
}

/** Position label for multi-injury strip — null when a single item remains. */
export function reassessmentProgressLabel(index: number, length: number): string | null {
  if (length <= 1) {
    return null;
  }
  const safe = clampReassessmentIndex(index, length);
  return `${safe + 1} / ${length}`;
}

/** How many items are still waiting in the queue (including the current one). */
export function reassessmentRemainingLabel(length: number): string | null {
  if (length <= 1) {
    return null;
  }
  return length === 2 ? '2 restantes' : `${length} restantes`;
}

/** Chip text: drop redundant "Douleur :" / "Blessure :" when section already says it. */
export function reassessmentChipLabel(noteTitle: string): string {
  const trimmed = noteTitle.trim();
  const stripped = trimmed.replace(/^(Douleur|Blessure)\s*:\s*/i, '').trim();
  return stripped.length > 0 ? stripped : trimmed;
}

/**
 * Pure helpers for the post-session pain reassessment pager.
 * Index clamp stays out of React so swipe/slider controls stay testable.
 */

export function clampReassessmentIndex(index: number, length: number): number {
  if (length <= 0) {
    return 0;
  }
  return Math.min(length - 1, Math.max(0, Math.floor(index)));
}

export function reassessmentProgressLabel(index: number, length: number): string | null {
  if (length <= 1) {
    return null;
  }
  const safe = clampReassessmentIndex(index, length);
  return `${safe + 1} / ${length}`;
}

/** Fraction 0..1 for a range slider thumb (multi-injury only). */
export function reassessmentSliderValue(index: number, length: number): number {
  if (length <= 1) {
    return 0;
  }
  return clampReassessmentIndex(index, length) / (length - 1);
}

export function reassessmentIndexFromSlider(value: number, length: number): number {
  if (length <= 1) {
    return 0;
  }
  const clamped = Math.min(1, Math.max(0, value));
  return clampReassessmentIndex(Math.round(clamped * (length - 1)), length);
}

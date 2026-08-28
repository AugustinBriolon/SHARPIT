type HapticPattern = 'tap' | 'success' | 'error';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  tap: 8,
  success: [8, 40, 8],
  error: [20, 50, 20, 50, 20],
};

/** Fires a haptic pulse via the Web Vibration API (Android Chrome only — iOS Safari does not support it). */
export function haptic(pattern: HapticPattern = 'tap'): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) {
    return;
  }
  navigator.vibrate(PATTERNS[pattern]);
}

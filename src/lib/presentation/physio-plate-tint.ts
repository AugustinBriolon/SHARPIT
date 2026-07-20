/**
 * Soft plate tint from semantic text colour classes — flat wash, never punitive red.
 * Gradients forbidden (Seed / DESIGN_LANGUAGE flat fields).
 * Good / go states use primary (leaf) → recovery wash; caution stays signal-caution.
 */
export function softTintFromQualityClass(
  colorClass: string | null | undefined,
): string | undefined {
  if (!colorClass) return undefined;
  if (
    colorClass.includes('signal-caution') ||
    colorClass.includes('signal-vo2') ||
    colorClass.includes('signal-risk') ||
    colorClass.includes('amber') ||
    colorClass.includes('orange') ||
    colorClass.includes('red')
  ) {
    return 'bg-[var(--color-signal-caution)]/12';
  }
  if (
    colorClass.includes('primary') ||
    colorClass.includes('signal-recovery') ||
    colorClass.includes('emerald') ||
    colorClass.includes('green')
  ) {
    /* Soft lime wash — continues highlight family on positive plates */
    return 'bg-highlight/35';
  }
  if (colorClass.includes('signal-tempo')) {
    return 'bg-[var(--color-signal-tempo)]/14';
  }
  if (colorClass.includes('blue') || colorClass.includes('signal-base')) {
    return 'bg-[var(--color-signal-base)]/12';
  }
  return undefined;
}

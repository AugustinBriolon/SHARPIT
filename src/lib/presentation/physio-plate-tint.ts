/**
 * Soft plate tint from semantic text colour classes — caution wash, never punitive red.
 */
export function softTintFromQualityClass(
  colorClass: string | null | undefined,
): string | undefined {
  if (!colorClass) return undefined;
  if (colorClass.includes('amber') || colorClass.includes('orange') || colorClass.includes('red')) {
    return 'bg-linear-to-br from-[var(--color-signal-caution)]/12 to-transparent';
  }
  if (colorClass.includes('emerald') || colorClass.includes('green')) {
    return 'bg-linear-to-br from-[var(--color-signal-recovery)]/12 to-transparent';
  }
  if (colorClass.includes('blue') || colorClass.includes('primary')) {
    return 'bg-linear-to-br from-[var(--color-signal-base)]/12 to-transparent';
  }
  return undefined;
}

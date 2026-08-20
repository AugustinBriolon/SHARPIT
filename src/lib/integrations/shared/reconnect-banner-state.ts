/**
 * Deterministic snooze key for the reconnect banner, derived from the
 * sorted list of provider names so the banner can be dismissed once per
 * unique combination.
 */
export function reconnectSnoozeKey(providerNames: string[]): string {
  if (providerNames.length === 0) return '';
  return `reconnect:${[...providerNames].sort().join(',')}`;
}

/**
 * Previously mounted a sticky progressive blur under the Dynamic Island.
 *
 * Removed from AppShell: in Safari tabs the overlay cannot paint inside the
 * status strip (OS Liquid Glass owns that), and it was clipping the first
 * page title. Readable content clears the strip via inline `paddingTop` on
 * the reading column instead (ADR-039).
 *
 * Kept as a no-op export so any stale import fails loudly in tests rather
 * than silently remounting an overlay.
 */
export function SystemEdgeBlur(_props: { enabled?: boolean }) {
  return null;
}

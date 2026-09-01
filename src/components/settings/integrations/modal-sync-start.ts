/**
 * Call when the athlete starts a sync (or full import) from the integrations modal.
 * Closes the modal immediately; the toast remains the progress UI.
 */
export function notifyIntegrationSyncStarted(options: { onSyncStart?: () => void }): void {
  options.onSyncStart?.();
}

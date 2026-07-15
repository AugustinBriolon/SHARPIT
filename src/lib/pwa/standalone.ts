/**
 * Standalone (installed) display-mode detection — pure, so it's testable without a browser.
 *
 * Chrome/Edge/Safari all honor `(display-mode: standalone)`. iOS Safari additionally
 * exposes the legacy `navigator.standalone` boolean, which remains the most reliable
 * signal there even where the media query also works.
 */
export function resolveStandaloneMode(input: {
  matchesDisplayModeStandalone: boolean;
  navigatorStandalone: boolean | undefined;
}): boolean {
  return input.matchesDisplayModeStandalone || input.navigatorStandalone === true;
}

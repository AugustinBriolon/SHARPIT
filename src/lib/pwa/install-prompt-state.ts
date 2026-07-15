/**
 * Install-prompt classification and dismissal timing — pure, browser-independent.
 *
 * `beforeinstallprompt` is a Chrome/Edge (Android + desktop) concept only; Safari
 * (iOS and macOS) never fires it — install there is always the manual Share sheet.
 * Firefox supports neither, on any platform.
 */
export type InstallPromptKind =
  'ALREADY_INSTALLED' | 'NATIVE_PROMPT' | 'IOS_INSTRUCTIONS' | 'UNSUPPORTED';

export function classifyInstallPrompt(input: {
  isStandalone: boolean;
  isIOS: boolean;
  hasBeforeInstallPromptEvent: boolean;
}): InstallPromptKind {
  if (input.isStandalone) return 'ALREADY_INSTALLED';
  if (input.hasBeforeInstallPromptEvent) return 'NATIVE_PROMPT';
  if (input.isIOS) return 'IOS_INSTRUCTIONS';
  return 'UNSUPPORTED';
}

/** Once dismissed, the install card stays hidden for this long before it can reappear. */
export const INSTALL_DISMISSAL_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

export function shouldShowInstallCard(input: {
  kind: InstallPromptKind;
  dismissedAt: number | null;
  now: number;
}): boolean {
  if (input.kind === 'ALREADY_INSTALLED' || input.kind === 'UNSUPPORTED') return false;
  if (input.dismissedAt == null) return true;
  return input.now - input.dismissedAt >= INSTALL_DISMISSAL_COOLDOWN_MS;
}

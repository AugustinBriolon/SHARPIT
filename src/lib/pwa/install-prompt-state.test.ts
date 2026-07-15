import { describe, expect, it } from 'vitest';
import {
  classifyInstallPrompt,
  shouldShowInstallCard,
  INSTALL_DISMISSAL_COOLDOWN_MS,
} from './install-prompt-state';

describe('classifyInstallPrompt', () => {
  it('is ALREADY_INSTALLED whenever standalone, regardless of platform', () => {
    expect(
      classifyInstallPrompt({
        isStandalone: true,
        isIOS: true,
        hasBeforeInstallPromptEvent: false,
      }),
    ).toBe('ALREADY_INSTALLED');
    expect(
      classifyInstallPrompt({
        isStandalone: true,
        isIOS: false,
        hasBeforeInstallPromptEvent: true,
      }),
    ).toBe('ALREADY_INSTALLED');
  });

  it('is NATIVE_PROMPT on Chrome/Edge (beforeinstallprompt fired), not standalone', () => {
    expect(
      classifyInstallPrompt({
        isStandalone: false,
        isIOS: false,
        hasBeforeInstallPromptEvent: true,
      }),
    ).toBe('NATIVE_PROMPT');
  });

  it('is IOS_INSTRUCTIONS on iOS Safari, which never fires beforeinstallprompt', () => {
    expect(
      classifyInstallPrompt({
        isStandalone: false,
        isIOS: true,
        hasBeforeInstallPromptEvent: false,
      }),
    ).toBe('IOS_INSTRUCTIONS');
  });

  it('is UNSUPPORTED on a platform with neither signal (e.g. Firefox) — never shows iOS instructions there', () => {
    expect(
      classifyInstallPrompt({
        isStandalone: false,
        isIOS: false,
        hasBeforeInstallPromptEvent: false,
      }),
    ).toBe('UNSUPPORTED');
  });
});

describe('shouldShowInstallCard', () => {
  const now = 1_752_500_000_000;

  it('never shows for ALREADY_INSTALLED or UNSUPPORTED, regardless of dismissal state', () => {
    expect(shouldShowInstallCard({ kind: 'ALREADY_INSTALLED', dismissedAt: null, now })).toBe(
      false,
    );
    expect(shouldShowInstallCard({ kind: 'UNSUPPORTED', dismissedAt: null, now })).toBe(false);
  });

  it('shows when never dismissed', () => {
    expect(shouldShowInstallCard({ kind: 'NATIVE_PROMPT', dismissedAt: null, now })).toBe(true);
  });

  it('stays hidden within the cooldown window after dismissal', () => {
    const dismissedAt = now - INSTALL_DISMISSAL_COOLDOWN_MS / 2;
    expect(shouldShowInstallCard({ kind: 'IOS_INSTRUCTIONS', dismissedAt, now })).toBe(false);
  });

  it('reappears exactly at the cooldown boundary', () => {
    const dismissedAt = now - INSTALL_DISMISSAL_COOLDOWN_MS;
    expect(shouldShowInstallCard({ kind: 'IOS_INSTRUCTIONS', dismissedAt, now })).toBe(true);
  });
});

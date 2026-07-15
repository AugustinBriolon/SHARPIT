'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  classifyInstallPrompt,
  shouldShowInstallCard,
  type InstallPromptKind,
} from '@/lib/pwa/install-prompt-state';
import { useStandalone } from '@/hooks/use-standalone';

const DISMISSED_AT_STORAGE_KEY = 'sharpit:install-prompt-dismissed-at';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOSDevice(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function readDismissedAt(): number | null {
  const raw = window.localStorage.getItem(DISMISSED_AT_STORAGE_KEY);
  const parsed = raw ? Number(raw) : null;
  return parsed != null && Number.isFinite(parsed) ? parsed : null;
}

export interface UseInstallPromptResult {
  kind: InstallPromptKind;
  /** Whether the Settings install card should render, honoring the dismissal cooldown. */
  visible: boolean;
  /** Only meaningful for kind === 'NATIVE_PROMPT'. */
  install: () => Promise<void>;
  dismiss: () => void;
}

/**
 * Settings-page install experience. No global banner — see ADR-008 for why: this
 * card only ever renders in a context the athlete visits deliberately, which
 * satisfies "never during a coaching action or dialog" by construction rather
 * than by detecting open dialogs app-wide.
 */
export function useInstallPrompt(): UseInstallPromptResult {
  const isStandalone = useStandalone();
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  useEffect(() => {
    setDismissedAt(readDismissedAt());

    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, []);

  const kind = classifyInstallPrompt({
    isStandalone,
    isIOS: isIOSDevice(),
    hasBeforeInstallPromptEvent: deferredEvent != null,
  });

  const visible = shouldShowInstallCard({ kind, dismissedAt, now: Date.now() });

  const install = useCallback(async () => {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    await deferredEvent.userChoice;
    setDeferredEvent(null);
  }, [deferredEvent]);

  const dismiss = useCallback(() => {
    const now = Date.now();
    window.localStorage.setItem(DISMISSED_AT_STORAGE_KEY, String(now));
    setDismissedAt(now);
  }, []);

  return { kind, visible, install, dismiss };
}

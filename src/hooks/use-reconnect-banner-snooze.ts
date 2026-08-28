'use client';

import { useCallback, useEffect, useState } from 'react';

const SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 h

function storageKey(snoozeKey: string) {
  return `sharpit:snooze:${snoozeKey}`;
}

export function useReconnectBannerSnooze(snoozeKey: string | null | undefined) {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!snoozeKey) {
      setReady(true);
      return;
    }
    try {
      const raw = localStorage.getItem(storageKey(snoozeKey));
      if (raw) {
        const ts = Number(raw);
        if (Date.now() - ts < SNOOZE_DURATION_MS) {
          setVisible(false);
        }
      }
    } catch {
      // localStorage unavailable
    }
    setReady(true);
  }, [snoozeKey]);

  const snooze = useCallback(() => {
    if (!snoozeKey) {
      return;
    }
    try {
      localStorage.setItem(storageKey(snoozeKey), String(Date.now()));
    } catch {
      // localStorage unavailable
    }
    setVisible(false);
  }, [snoozeKey]);

  return { ready, visible, snooze };
}

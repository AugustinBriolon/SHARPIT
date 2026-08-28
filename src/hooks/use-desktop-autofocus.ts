'use client';

import { useEffect, type RefObject } from 'react';

/** Mouse / trackpad — focusing an input will not pop a software keyboard. */
export const FINE_POINTER_QUERY = '(hover: hover) and (pointer: fine)';

export function isFinePointer(
  matchMedia: (query: string) => Pick<MediaQueryList, 'matches'>,
): boolean {
  return matchMedia(FINE_POINTER_QUERY).matches;
}

/** Focus `ref` when `active` becomes true, only on fine-pointer devices. */
export function useDesktopAutofocus<T extends HTMLElement>(
  ref: RefObject<T | null>,
  active: boolean,
) {
  useEffect(() => {
    if (!active) {
      return;
    }
    if (typeof window === 'undefined') {
      return;
    }
    if (!isFinePointer((query) => window.matchMedia(query))) {
      return;
    }
    ref.current?.focus();
  }, [active, ref]);
}

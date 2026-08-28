const STORAGE_KEY = 'sharpit:session-link-dismissals';
const CHANGE_EVENT = 'sharpit:session-link-dismissals';

function parseStoredIds(raw: string | null): Set<string> {
  if (!raw) {
    return new Set();
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0));
  } catch {
    return new Set();
  }
}

export function readDismissedSessionLinkIds(): Set<string> {
  if (typeof window === 'undefined') {
    return new Set();
  }
  return parseStoredIds(window.localStorage.getItem(STORAGE_KEY));
}

/** Stable string snapshot for `useSyncExternalStore`. */
export function getDismissedSessionLinkIdsSnapshot(): string {
  return [...readDismissedSessionLinkIds()].sort().join('\0');
}

export function dismissSessionLinkSuggestion(id: string): void {
  if (typeof window === 'undefined' || !id) {
    return;
  }
  const next = readDismissedSessionLinkIds();
  next.add(id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeSessionLinkDismissals(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener('storage', onStoreChange);
  };
}

export function filterDismissedSessionLinkSuggestions<T extends { id: string }>(
  suggestions: readonly T[],
  dismissed: ReadonlySet<string>,
): T[] {
  if (dismissed.size === 0) {
    return [...suggestions];
  }
  return suggestions.filter((s) => !dismissed.has(s.id));
}

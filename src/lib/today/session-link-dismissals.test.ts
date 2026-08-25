import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dismissSessionLinkSuggestion,
  filterDismissedSessionLinkSuggestions,
  readDismissedSessionLinkIds,
} from '@/lib/today/session-link-dismissals';

const STORAGE_KEY = 'sharpit:session-link-dismissals';

function installWindowStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('window', {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
    dispatchEvent: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  return store;
}

describe('session-link-dismissals', () => {
  beforeEach(() => {
    installWindowStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns empty set when nothing stored', () => {
    expect(readDismissedSessionLinkIds().size).toBe(0);
  });

  it('persists dismissed suggestion ids', () => {
    dismissSessionLinkSuggestion('plan:act');
    expect(readDismissedSessionLinkIds().has('plan:act')).toBe(true);
  });

  it('filters dismissed suggestions', () => {
    const suggestions = [
      { id: 'a:1', label: 'A' },
      { id: 'b:2', label: 'B' },
    ];
    dismissSessionLinkSuggestion('a:1');
    const visible = filterDismissedSessionLinkSuggestions(
      suggestions,
      readDismissedSessionLinkIds(),
    );
    expect(visible).toEqual([{ id: 'b:2', label: 'B' }]);
  });

  it('ignores corrupt storage payloads', () => {
    const store = installWindowStorage();
    store.set(STORAGE_KEY, '{not-json');
    expect(readDismissedSessionLinkIds().size).toBe(0);
  });
});

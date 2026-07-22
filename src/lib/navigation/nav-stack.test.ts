import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Minimal in-memory sessionStorage shim — nav-stack only relies on
 * `getItem` / `setItem` / `removeItem`, so we don't need jsdom.
 */
function createStorageMock(): Storage {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    key: (index) => Array.from(store.keys())[index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
  return storage;
}

let storageMock: Storage;

beforeEach(async () => {
  storageMock = createStorageMock();
  vi.stubGlobal('window', { sessionStorage: storageMock });
  // Re-import module so any cached state (none currently) is fresh.
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function loadNavStack() {
  return import('./nav-stack');
}

describe('navStack', () => {
  it('push then peek returns the last entry', async () => {
    const { navStack } = await loadNavStack();
    navStack.push({ href: '/training', label: 'Entraînement', ts: 1 });
    expect(navStack.peek()).toEqual({ href: '/training', label: 'Entraînement', ts: 1 });
  });

  it('collapses consecutive duplicates instead of stacking twice', async () => {
    const { navStack } = await loadNavStack();
    navStack.push({ href: '/training', label: 'Entraînement', ts: 1 });
    navStack.push({ href: '/training', label: 'Entraînement', ts: 2 });
    navStack.push({ href: '/training', label: 'Entraînement', ts: 3 });
    expect(navStack.all()).toHaveLength(1);
    expect(navStack.peek()?.ts).toBe(3);
  });

  it('caps the stack at MAX_ENTRIES (FIFO drop of oldest)', async () => {
    const { navStack, NAV_STACK_MAX_ENTRIES } = await loadNavStack();
    for (let i = 0; i < NAV_STACK_MAX_ENTRIES + 5; i++) {
      navStack.push({ href: `/page-${i}`, label: `Page ${i}`, ts: i });
    }
    const entries = navStack.all();
    expect(entries).toHaveLength(NAV_STACK_MAX_ENTRIES);
    expect(entries[0]?.href).toBe(`/page-5`);
    expect(entries[entries.length - 1]?.href).toBe(`/page-${NAV_STACK_MAX_ENTRIES + 4}`);
  });

  it('peekBackFrom skips the current href and returns the first different entry', async () => {
    const { navStack } = await loadNavStack();
    navStack.push({ href: '/training/history', label: 'Historique', ts: 1 });
    navStack.push({ href: '/training/abc', label: 'Séance', ts: 2 });
    expect(navStack.peekBackFrom('/training/abc')).toEqual({
      href: '/training/history',
      label: 'Historique',
      ts: 1,
    });
  });

  it('peekBackFrom returns null when only the current href is on the stack', async () => {
    const { navStack } = await loadNavStack();
    navStack.push({ href: '/training/abc', label: 'Séance', ts: 1 });
    expect(navStack.peekBackFrom('/training/abc')).toBeNull();
  });

  it('replaceTop overwrites the last entry, keeping length stable', async () => {
    const { navStack } = await loadNavStack();
    navStack.push({ href: '/training/history', label: 'Historique', ts: 1 });
    navStack.push({ href: '/training/abc', label: 'Séance', ts: 2 });
    navStack.replaceTop({ href: '/training/abc?tab=zones', label: 'Séance', ts: 3 });
    const entries = navStack.all();
    expect(entries).toHaveLength(2);
    expect(entries[1]?.href).toBe('/training/abc?tab=zones');
  });

  it('persists across a reload (sessionStorage roundtrip)', async () => {
    const { navStack, NAV_STACK_STORAGE_KEY } = await loadNavStack();
    navStack.push({ href: '/training', label: 'Entraînement', ts: 1 });
    navStack.push({ href: '/training/history', label: 'Historique', ts: 2 });

    const raw = storageMock.getItem(NAV_STACK_STORAGE_KEY);
    expect(raw).not.toBeNull();

    vi.resetModules();
    const reloaded = await loadNavStack();
    expect(reloaded.navStack.all()).toHaveLength(2);
    expect(reloaded.navStack.peek()?.href).toBe('/training/history');
  });

  it('collapses same-pathname pushes (search-only change) into a single entry with the latest href', async () => {
    const { navStack } = await loadNavStack();
    navStack.push({ href: '/training/progression?tab=etat', label: 'Progression', ts: 1 });
    navStack.push({ href: '/training/progression?tab=records', label: 'Progression', ts: 2 });
    navStack.push({
      href: '/training/progression?tab=records&sport=bike',
      label: 'Progression',
      ts: 3,
    });
    const entries = navStack.all();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.href).toBe('/training/progression?tab=records&sport=bike');
  });

  it('rewinds to an existing pathname (pop-above) and refreshes it with the latest href', async () => {
    const { navStack } = await loadNavStack();
    navStack.push({ href: '/training', label: 'Entraînement', ts: 1 });
    navStack.push({
      href: '/training/progression?tab=records&sport=bike',
      label: 'Progression',
      ts: 2,
    });
    navStack.push({ href: '/training/abc', label: 'Séance', ts: 3 });
    navStack.push({
      href: '/training/progression?tab=records&sport=bike',
      label: 'Progression',
      ts: 4,
    });
    const entries = navStack.all();
    expect(entries.map((e) => e.href)).toEqual([
      '/training',
      '/training/progression?tab=records&sport=bike',
    ]);
    expect(entries[1]?.ts).toBe(4);
  });

  it('rewinds all the way back on repeated activity → back cycles (no history bloat)', async () => {
    const { navStack } = await loadNavStack();
    navStack.push({ href: '/training', label: 'Entraînement', ts: 1 });
    navStack.push({ href: '/training/progression?tab=records', label: 'Progression', ts: 2 });
    navStack.push({ href: '/training/abc', label: 'Séance', ts: 3 });
    navStack.push({ href: '/training/progression?tab=records', label: 'Progression', ts: 4 });
    navStack.push({ href: '/training/def', label: 'Séance', ts: 5 });
    navStack.push({ href: '/training/progression?tab=records', label: 'Progression', ts: 6 });
    navStack.push({ href: '/training', label: 'Entraînement', ts: 7 });
    expect(navStack.all().map((e) => e.href)).toEqual(['/training']);
  });

  it('clear wipes storage', async () => {
    const { navStack, NAV_STACK_STORAGE_KEY } = await loadNavStack();
    navStack.push({ href: '/training', label: 'Entraînement', ts: 1 });
    navStack.clear();
    expect(navStack.all()).toEqual([]);
    expect(storageMock.getItem(NAV_STACK_STORAGE_KEY)).toBeNull();
  });

  it('ignores corrupted storage gracefully', async () => {
    storageMock.setItem('sharpit:nav-stack', 'not-json');
    const { navStack } = await loadNavStack();
    expect(navStack.all()).toEqual([]);
    expect(navStack.peek()).toBeNull();
  });
});

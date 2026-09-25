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

const WEEK = { href: '/plan/semaine', label: 'La semaine' } as const;
const HISTORY = { href: '/activite', label: 'Activité' } as const;

describe('navStack', () => {
  it('push then peek returns the last entry', async () => {
    const { navStack } = await loadNavStack();
    navStack.push({ ...WEEK, ts: 1 });
    expect(navStack.peek()).toEqual({ ...WEEK, ts: 1 });
  });

  it('collapses consecutive duplicates instead of stacking twice', async () => {
    const { navStack } = await loadNavStack();
    navStack.push({ ...WEEK, ts: 1 });
    navStack.push({ ...WEEK, ts: 2 });
    navStack.push({ ...WEEK, ts: 3 });
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
    navStack.push({ ...HISTORY, ts: 1 });
    navStack.push({ href: '/activite/abc', label: 'Séance', ts: 2 });
    expect(navStack.peekBackFrom('/activite/abc')).toEqual({ ...HISTORY, ts: 1 });
  });

  it('does not push activity edit routes (transient — modal-like)', async () => {
    const { navStack } = await loadNavStack();
    navStack.push({ ...HISTORY, ts: 1 });
    navStack.push({ href: '/activite/abc', label: 'Séance', ts: 2 });
    navStack.push({ href: '/activite/abc/edit', label: 'Édition', ts: 3 });
    expect(navStack.all().map((e) => e.href)).toEqual(['/activite', '/activite/abc']);
  });

  it('after edit → detail, Back resolves to the pre-edit page (edit omitted)', async () => {
    const { navStack } = await loadNavStack();
    navStack.push({ ...HISTORY, ts: 1 });
    navStack.push({ href: '/activite/abc', label: 'Séance', ts: 2 });
    navStack.push({ href: '/activite/abc/edit', label: 'Édition', ts: 3 });
    navStack.push({ href: '/activite/abc', label: 'Séance', ts: 4 });
    expect(navStack.peekBackFrom('/activite/abc')).toEqual({ ...HISTORY, ts: 1 });
  });

  it('peekBackFrom skips a stale edit entry left on the stack', async () => {
    const { navStack, NAV_STACK_STORAGE_KEY } = await loadNavStack();
    storageMock.setItem(
      NAV_STACK_STORAGE_KEY,
      JSON.stringify([
        { href: '/activite', label: 'Activité', ts: 1 },
        { href: '/activite/abc', label: 'Séance', ts: 2 },
        { href: '/activite/abc/edit', label: 'Édition', ts: 3 },
      ]),
    );
    expect(navStack.peekBackFrom('/activite/abc')).toEqual({ ...HISTORY, ts: 1 });
  });

  it('peekBackFrom returns null when only the current href is on the stack', async () => {
    const { navStack } = await loadNavStack();
    navStack.push({ href: '/activite/abc', label: 'Séance', ts: 1 });
    expect(navStack.peekBackFrom('/activite/abc')).toBeNull();
  });

  it('replaceTop overwrites the last entry, keeping length stable', async () => {
    const { navStack } = await loadNavStack();
    navStack.push({ ...HISTORY, ts: 1 });
    navStack.push({ href: '/activite/abc', label: 'Séance', ts: 2 });
    navStack.replaceTop({ href: '/activite/abc?tab=zones', label: 'Séance', ts: 3 });
    const entries = navStack.all();
    expect(entries).toHaveLength(2);
    expect(entries[1]?.href).toBe('/activite/abc?tab=zones');
  });

  it('persists across a reload (sessionStorage roundtrip)', async () => {
    const { navStack, NAV_STACK_STORAGE_KEY } = await loadNavStack();
    navStack.push({ ...WEEK, ts: 1 });
    navStack.push({ ...HISTORY, ts: 2 });

    const raw = storageMock.getItem(NAV_STACK_STORAGE_KEY);
    expect(raw).not.toBeNull();

    vi.resetModules();
    const reloaded = await loadNavStack();
    expect(reloaded.navStack.all()).toHaveLength(2);
    expect(reloaded.navStack.peek()?.href).toBe('/activite');
  });

  it('collapses same-pathname pushes (search-only change) into a single entry with the latest href', async () => {
    const { navStack } = await loadNavStack();
    navStack.push({ href: '/moi/performance', label: 'Performance', ts: 1 });
    navStack.push({ href: '/moi/performance?sport=run', label: 'Performance', ts: 2 });
    navStack.push({ href: '/moi/performance?sport=bike', label: 'Performance', ts: 3 });
    const entries = navStack.all();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.href).toBe('/moi/performance?sport=bike');
  });

  it('rewinds to an existing pathname (pop-above) and refreshes it with the latest href', async () => {
    const { navStack } = await loadNavStack();
    navStack.push({ ...WEEK, ts: 1 });
    navStack.push({ href: '/moi/performance?sport=bike', label: 'Performance', ts: 2 });
    navStack.push({ href: '/activite/abc', label: 'Séance', ts: 3 });
    navStack.push({ href: '/moi/performance?sport=bike', label: 'Performance', ts: 4 });
    const entries = navStack.all();
    expect(entries.map((e) => e.href)).toEqual(['/plan/semaine', '/moi/performance?sport=bike']);
    expect(entries[1]?.ts).toBe(4);
  });

  it('rewinds all the way back on repeated activity → back cycles (no history bloat)', async () => {
    const { navStack } = await loadNavStack();
    navStack.push({ ...WEEK, ts: 1 });
    navStack.push({ href: '/moi/performance', label: 'Performance', ts: 2 });
    navStack.push({ href: '/activite/abc', label: 'Séance', ts: 3 });
    navStack.push({ href: '/moi/performance', label: 'Performance', ts: 4 });
    navStack.push({ href: '/activite/def', label: 'Séance', ts: 5 });
    navStack.push({ href: '/moi/performance', label: 'Performance', ts: 6 });
    navStack.push({ ...WEEK, ts: 7 });
    expect(navStack.all().map((e) => e.href)).toEqual(['/plan/semaine']);
  });

  it('clear wipes storage', async () => {
    const { navStack, NAV_STACK_STORAGE_KEY } = await loadNavStack();
    navStack.push({ ...WEEK, ts: 1 });
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

import { expect, type Page } from '@playwright/test';

/**
 * IndexedDB contract from `src/lib/pwa/snapshot-store.ts` —
 * DB `sharpit-pwa`, version `1`, store `athlete-snapshot`, key `current`.
 * Schema version matches `OFFLINE_SNAPSHOT_SCHEMA_VERSION` in
 * `src/lib/pwa/snapshot-store-validation.ts`.
 */
const DB_NAME = 'sharpit-pwa';
const DB_VERSION = 1;
const STORE_NAME = 'athlete-snapshot';
const RECORD_KEY = 'current';
const SCHEMA_VERSION = 1;

const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

export type OfflineSnapshotEntry = {
  schemaVersion: number;
  ownerKey: string;
  snapshot: {
    snapshotId: string;
    generatedAt: string;
    freshness: { computedAt: string };
    todaysDecision: string | null;
    confidenceLabel: string | null;
    limitingFactor: { description: string } | null;
  };
  generatedAt: string;
  freshnessComputedAt: string;
  cachedAt: string;
};

/** Minimal persisted entry that passes `validatePersistedSnapshot` shape checks. */
export function minimalOfflineEntry(ownerKey: string): OfflineSnapshotEntry {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    ownerKey,
    snapshot: {
      snapshotId: 'e2e-offline-snap',
      generatedAt: now,
      freshness: { computedAt: now },
      todaysDecision: null,
      confidenceLabel: null,
      limitingFactor: null,
    },
    generatedAt: now,
    freshnessComputedAt: now,
    cachedAt: now,
  };
}

export async function seedOfflineSnapshot(page: Page, entry: OfflineSnapshotEntry): Promise<void> {
  await page.evaluate(
    async ({ dbName, dbVersion, storeName, recordKey, entry: record }) => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(storeName, 'readwrite');
          tx.objectStore(storeName).put(record, recordKey);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error ?? new Error('IndexedDB put failed'));
          };
        };
        request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
      });
    },
    {
      dbName: DB_NAME,
      dbVersion: DB_VERSION,
      storeName: STORE_NAME,
      recordKey: RECORD_KEY,
      entry,
    },
  );
}

export async function clearOfflineSnapshot(page: Page): Promise<void> {
  await page.evaluate(
    async ({ dbName, dbVersion, storeName, recordKey }) => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(dbName, dbVersion);
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName);
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.close();
            resolve();
            return;
          }
          const tx = db.transaction(storeName, 'readwrite');
          tx.objectStore(storeName).delete(recordKey);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error ?? new Error('IndexedDB delete failed'));
          };
        };
        request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
      });
    },
    {
      dbName: DB_NAME,
      dbVersion: DB_VERSION,
      storeName: STORE_NAME,
      recordKey: RECORD_KEY,
    },
  );
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflowed = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth > root.clientWidth + 1;
  });
  expect(overflowed).toBe(false);
}

/** Must run before navigation so `useStandalone` reads the stub on mount. */
export async function forceMatchMediaStandalone(page: Page, matches: boolean): Promise<void> {
  await page.addInitScript((standalone) => {
    const original = window.matchMedia.bind(window);
    window.matchMedia = ((query: string) => {
      if (query.includes('display-mode: standalone')) {
        return {
          matches: standalone,
          media: query,
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() {
            return false;
          },
        } as MediaQueryList;
      }
      return original(query);
    }) as typeof window.matchMedia;
  }, matches);
}

/** Must run before navigation — `useInstallPrompt` reads UA once on classify. */
export async function stubIosUserAgent(page: Page): Promise<void> {
  await page.addInitScript((ua) => {
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      get: () => ua,
    });
  }, IOS_SAFARI_UA);
}

/**
 * Arms a cancelable `beforeinstallprompt` that fires as soon as InstallCard's
 * listener attaches (and again after mount for late subscribers). Must run
 * before navigation.
 */
export async function stubBeforeInstallPrompt(page: Page): Promise<void> {
  await page.addInitScript(() => {
    function fireBeforeInstallPrompt() {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      Object.defineProperties(event, {
        prompt: {
          value: async () => {},
        },
        userChoice: {
          value: Promise.resolve({ outcome: 'accepted' as const }),
        },
      });
      window.dispatchEvent(event);
    }

    const original = window.addEventListener.bind(window);
    window.addEventListener = ((
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ) => {
      original(type, listener, options);
      if (type === 'beforeinstallprompt') {
        queueMicrotask(fireBeforeInstallPrompt);
      }
    }) as typeof window.addEventListener;

    // Late dispatch after hydration in case the effect already subscribed.
    window.addEventListener('DOMContentLoaded', () => {
      queueMicrotask(fireBeforeInstallPrompt);
    });
  });
}

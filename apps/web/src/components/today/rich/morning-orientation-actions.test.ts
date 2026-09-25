import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  morningHoldStorageKey,
  readClientMorningHold,
  writeClientMorningHold,
} from '@/components/today/rich/morning-orientation-actions';

describe('morning hold sessionStorage', () => {
  const store = new Map<string, string>();
  const storageMock = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('sessionStorage', storageMock);
    vi.stubGlobal('window', {
      sessionStorage: storageMock,
      dispatchEvent: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads false when unset', () => {
    expect(readClientMorningHold('2026-08-10')).toBe(false);
  });

  it('writes and reads the hold flag', () => {
    writeClientMorningHold('2026-08-10');
    expect(store.get(morningHoldStorageKey('2026-08-10'))).toBe('1');
    expect(readClientMorningHold('2026-08-10')).toBe(true);
    expect(window.dispatchEvent).toHaveBeenCalled();
  });
});

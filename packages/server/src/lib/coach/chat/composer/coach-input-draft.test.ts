import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
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
}

let storageMock: Storage;

beforeEach(() => {
  storageMock = createStorageMock();
  vi.stubGlobal('window', { sessionStorage: storageMock });
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

async function load() {
  return import('./coach-input-draft');
}

describe('coach-input-draft', () => {
  it('roundtrips a draft per conversation', async () => {
    const { writeCoachInputDraft, readCoachInputDraft } = await load();
    writeCoachInputDraft('conv-a', 'Brouillon A');
    writeCoachInputDraft('conv-b', 'Brouillon B');
    expect(readCoachInputDraft('conv-a')).toBe('Brouillon A');
    expect(readCoachInputDraft('conv-b')).toBe('Brouillon B');
  });

  it('overwrites an existing draft (discuss intent)', async () => {
    const { writeCoachInputDraft, readCoachInputDraft } = await load();
    writeCoachInputDraft('conv-a', 'Ancien texte');
    writeCoachInputDraft('conv-a', 'Prompt discuter avec le coach');
    expect(readCoachInputDraft('conv-a')).toBe('Prompt discuter avec le coach');
  });

  it('clears on empty / whitespace write', async () => {
    const { writeCoachInputDraft, readCoachInputDraft, clearCoachInputDraft, coachInputDraftKey } =
      await load();
    writeCoachInputDraft('conv-a', 'Texte');
    writeCoachInputDraft('conv-a', '   ');
    expect(readCoachInputDraft('conv-a')).toBe('');
    expect(storageMock.getItem(coachInputDraftKey('conv-a'))).toBeNull();

    writeCoachInputDraft('conv-a', 'Encore');
    clearCoachInputDraft('conv-a');
    expect(readCoachInputDraft('conv-a')).toBe('');
  });

  it('returns empty when storage is missing or conversation id empty', async () => {
    const { readCoachInputDraft, writeCoachInputDraft } = await load();
    expect(readCoachInputDraft('')).toBe('');
    writeCoachInputDraft('', 'x');
    expect(storageMock.length).toBe(0);
  });
});

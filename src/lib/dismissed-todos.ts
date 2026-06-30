const STORAGE_KEY = 'sharpit:dismissed-todos';

type DismissStore = Record<string, string>;

function readStore(): DismissStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DismissStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: DismissStore) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** Empreinte du contenu d'une carte — réaffichée si le texte change. */
export function todoContentHash(title: string, detail: string): string {
  return `${title}::${detail}`;
}

export function loadDismissedTodoHashes(): DismissStore {
  return readStore();
}

export function dismissTodo(id: string, contentHash: string) {
  const store = readStore();
  store[id] = contentHash;
  writeStore(store);
}

export function isTodoDismissed(id: string, contentHash: string, store?: DismissStore): boolean {
  const s = store ?? readStore();
  return s[id] === contentHash;
}

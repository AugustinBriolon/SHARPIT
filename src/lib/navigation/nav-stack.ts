/**
 * App-managed navigation stack — the equivalent of an iOS UINavigationController.
 *
 * Backed by sessionStorage: survives page reloads, dies with the tab (matches
 * the mental model of "a session of exploration"). Each tab keeps its own stack.
 *
 * Never trusts the browser back stack, which cannot express intent
 * (e.g. arriving at a session from Training vs from History should back differently).
 */

export type NavStackEntry = {
  /** Full href — pathname + optional search string. */
  href: string;
  /** Human label pushed alongside the entry; consumed by MobileBackLink. */
  label: string;
  /** Push timestamp (ms), for debugging / TTL tooling. */
  ts: number;
};

const STORAGE_KEY = 'sharpit:nav-stack';
const MAX_ENTRIES = 15;

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function readRaw(): NavStackEntry[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry).slice(-MAX_ENTRIES);
  } catch {
    return [];
  }
}

function writeRaw(entries: NavStackEntry[]): void {
  if (!canUseStorage()) return;
  try {
    const capped = entries.slice(-MAX_ENTRIES);
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
  } catch {
    // Quota or private mode — stack degrades to in-memory only for this render.
  }
}

function isEntry(candidate: unknown): candidate is NavStackEntry {
  if (candidate == null || typeof candidate !== 'object') return false;
  const e = candidate as Record<string, unknown>;
  return typeof e.href === 'string' && typeof e.label === 'string' && typeof e.ts === 'number';
}

/** Strip query + hash — those are same-page state, not distinct entries. */
function pathnameOf(href: string): string {
  const noHash = href.split('#', 1)[0]!;
  return noHash.split('?', 1)[0]!;
}

/**
 * Push a navigation entry with true navigation-controller semantics:
 *
 * - Same pathname as an existing entry → **rewind** to that entry (pop all
 *   entries above) and refresh its href/label to preserve the latest state
 *   (e.g. `?tab=records&sport=bike`). This is how Back from an activity
 *   returns to Progression on the sport tab you left, and how repeated
 *   activity-then-back cycles do not accumulate history.
 * - Query-only change on the current top (same pathname) → replace in place
 *   (never treat `?tab=` / `?sport=` as new pages).
 * - New pathname → push on top.
 */
function push(entry: NavStackEntry): void {
  const stack = readRaw();
  const targetPath = pathnameOf(entry.href);
  const existingIdx = stack.findIndex((e) => pathnameOf(e.href) === targetPath);

  if (existingIdx >= 0) {
    stack.length = existingIdx + 1;
    stack[existingIdx] = entry;
  } else {
    stack.push(entry);
  }
  writeRaw(stack);
}

/** Replace the top of the stack, regardless of href. */
function replaceTop(entry: NavStackEntry): void {
  const stack = readRaw();
  if (stack.length === 0) stack.push(entry);
  else stack[stack.length - 1] = entry;
  writeRaw(stack);
}

function peek(): NavStackEntry | null {
  const stack = readRaw();
  return stack[stack.length - 1] ?? null;
}

/**
 * Walk down from the top, skipping any entry equal to `currentHref`.
 * Returns the first different entry, or null if none.
 *
 * This is what powers Back: from A we never return to A even if the top
 * happens to be A (e.g. duplicate push during hydration).
 */
function peekBackFrom(currentHref: string): NavStackEntry | null {
  const stack = readRaw();
  for (let i = stack.length - 1; i >= 0; i--) {
    const entry = stack[i]!;
    if (entry.href !== currentHref) return entry;
  }
  return null;
}

function all(): NavStackEntry[] {
  return readRaw();
}

function clear(): void {
  if (!canUseStorage()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const navStack = {
  push,
  replaceTop,
  peek,
  peekBackFrom,
  all,
  clear,
};

/** Constants exposed for tests. */
export const NAV_STACK_STORAGE_KEY = STORAGE_KEY;
export const NAV_STACK_MAX_ENTRIES = MAX_ENTRIES;

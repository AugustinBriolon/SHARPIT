const STORAGE_KEY = 'sharpit:demo-session-links';
const CHANGE_EVENT = 'sharpit:demo-session-links';

import type { DemoLinkPlannedSnapshot } from '@/lib/demo/demo-session-link-overlay';
import type { ActivityNarrative, SessionAnalysis } from '@/lib/validators/coach';

export type DemoSessionLinkReading = {
  analysis: SessionAnalysis;
  narrative: ActivityNarrative;
  analyzedAt: string;
};

type DemoLinkEntry = {
  plannedSessionId: string;
  activityId: string;
  planned?: DemoLinkPlannedSnapshot;
  reading?: DemoSessionLinkReading;
};

function parseStored(raw: string | null): DemoLinkEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is DemoLinkEntry =>
        typeof item === 'object' &&
        item != null &&
        typeof (item as DemoLinkEntry).plannedSessionId === 'string' &&
        typeof (item as DemoLinkEntry).activityId === 'string',
    );
  } catch {
    return [];
  }
}

export function readDemoSessionLinks(): DemoLinkEntry[] {
  if (typeof window === 'undefined') return [];
  return parseStored(window.sessionStorage.getItem(STORAGE_KEY));
}

export function readDemoLinkedPlannedSessionIds(): Set<string> {
  return new Set(readDemoSessionLinks().map((entry) => entry.plannedSessionId));
}

export function markDemoSessionLinked(
  plannedSessionId: string,
  activityId: string,
  planned?: DemoLinkPlannedSnapshot,
): void {
  if (typeof window === 'undefined' || !plannedSessionId || !activityId) return;
  const next = readDemoSessionLinks().filter(
    (entry) => entry.plannedSessionId !== plannedSessionId,
  );
  next.push({ plannedSessionId, activityId, planned });
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function clearDemoSessionLink(plannedSessionId: string): void {
  if (typeof window === 'undefined' || !plannedSessionId) return;
  const next = readDemoSessionLinks().filter(
    (entry) => entry.plannedSessionId !== plannedSessionId,
  );
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function updateDemoSessionLinkReading(
  plannedSessionId: string,
  reading: DemoSessionLinkReading,
): void {
  if (typeof window === 'undefined' || !plannedSessionId) return;
  const links = readDemoSessionLinks();
  const index = links.findIndex((entry) => entry.plannedSessionId === plannedSessionId);
  if (index < 0) return;
  const next = links.slice();
  next[index] = { ...next[index]!, reading };
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function findDemoSessionLinkByActivityId(activityId: string): DemoLinkEntry | undefined {
  return readDemoSessionLinks().find((entry) => entry.activityId === activityId);
}

export function subscribeDemoSessionLinks(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(CHANGE_EVENT, onStoreChange);
}

export function getDemoSessionLinksSnapshot(): string {
  return readDemoSessionLinks()
    .map((entry) => `${entry.plannedSessionId}\0${entry.activityId}`)
    .sort()
    .join('\n');
}

export function filterDemoLinkedSessionSuggestions<T extends { plannedSessionId: string }>(
  suggestions: readonly T[],
  linkedPlannedIds: ReadonlySet<string>,
): T[] {
  if (linkedPlannedIds.size === 0) return [...suggestions];
  return suggestions.filter((s) => !linkedPlannedIds.has(s.plannedSessionId));
}

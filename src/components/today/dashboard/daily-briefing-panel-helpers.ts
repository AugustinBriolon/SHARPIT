const STORAGE_PREFIX = 'sharpit:today-briefing-seen:';

export function briefingSeenStorageKey(dayKey: string): string {
  return `${STORAGE_PREFIX}${dayKey}`;
}

/**
 * Open on first visit of the day, or while it is still morning locally.
 * After a later revisit the same afternoon/evening, stay collapsed.
 */
export function shouldOpenBriefingByDefault(input: {
  dayKey: string;
  now?: Date;
  storage?: Pick<Storage, 'getItem'> | null;
}): boolean {
  const hour = (input.now ?? new Date()).getHours();
  const isMorning = hour < 12;
  if (isMorning) {
    return true;
  }
  if (!input.dayKey) {
    return false;
  }
  try {
    const seen = input.storage?.getItem(briefingSeenStorageKey(input.dayKey));
    return seen !== '1';
  } catch {
    return true;
  }
}

export function markBriefingSeen(dayKey: string, storage?: Pick<Storage, 'setItem'> | null): void {
  if (!dayKey || !storage) {
    return;
  }
  try {
    storage.setItem(briefingSeenStorageKey(dayKey), '1');
  } catch {
    // private mode / quota — progressive disclosure degrades to defaultOpen only
  }
}

/** Split persisted briefing prose into paragraphs; no placeholder filler. */
export function splitBriefingParagraphs(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

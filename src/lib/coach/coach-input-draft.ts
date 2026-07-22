/**
 * Coach composer draft — sessionStorage (survives in-app navigation, dies on refresh).
 * Keyed by conversation id so each thread keeps its own unfinished input.
 */

const STORAGE_PREFIX = 'sharpit:coach-input-draft:';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function coachInputDraftKey(conversationId: string): string {
  return `${STORAGE_PREFIX}${conversationId}`;
}

export function readCoachInputDraft(conversationId: string): string {
  if (!canUseStorage() || !conversationId) return '';
  try {
    return window.sessionStorage.getItem(coachInputDraftKey(conversationId)) ?? '';
  } catch {
    return '';
  }
}

/** Persist draft; empty / whitespace-only clears the slot. */
export function writeCoachInputDraft(conversationId: string, text: string): void {
  if (!canUseStorage() || !conversationId) return;
  try {
    const key = coachInputDraftKey(conversationId);
    if (!text.trim()) {
      window.sessionStorage.removeItem(key);
      return;
    }
    window.sessionStorage.setItem(key, text);
  } catch {
    // Quota / private mode — draft is best-effort only.
  }
}

export function clearCoachInputDraft(conversationId: string): void {
  if (!canUseStorage() || !conversationId) return;
  try {
    window.sessionStorage.removeItem(coachInputDraftKey(conversationId));
  } catch {
    // ignore
  }
}

export const COACH_INPUT_DRAFT_STORAGE_PREFIX = STORAGE_PREFIX;

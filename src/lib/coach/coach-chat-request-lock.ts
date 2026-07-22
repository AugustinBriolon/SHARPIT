/**
 * Cross-instance locks for coach chat.
 * Survive React Strict Mode remounts (refs reset; module state does not).
 */

const autoReplyInFlight = new Set<string>();
const chatFetchAbortByConversation = new Map<string, AbortController>();

export function tryBeginAutoReply(conversationId: string): boolean {
  if (autoReplyInFlight.has(conversationId)) return false;
  autoReplyInFlight.add(conversationId);
  return true;
}

export function endAutoReply(conversationId: string): void {
  autoReplyInFlight.delete(conversationId);
}

/**
 * Abort any in-flight /api/coach/chat for this conversation, then return a fresh signal.
 * Keep the controller registered until replaced or explicitly aborted — do not clear when
 * fetch() resolves (headers only); the body may still be streaming.
 */
export function replaceChatFetchSignal(
  conversationId: string,
  outerSignal?: AbortSignal | null,
): AbortSignal {
  chatFetchAbortByConversation.get(conversationId)?.abort();
  const controller = new AbortController();
  chatFetchAbortByConversation.set(conversationId, controller);

  if (outerSignal) {
    if (outerSignal.aborted) {
      controller.abort();
    } else {
      const onAbort = () => controller.abort();
      outerSignal.addEventListener('abort', onAbort, { once: true });
    }
  }

  return controller.signal;
}

/** Abort and drop the in-flight controller (unmount / conversation change). */
export function abortChatFetch(conversationId: string): void {
  const current = chatFetchAbortByConversation.get(conversationId);
  if (!current) return;
  current.abort();
  chatFetchAbortByConversation.delete(conversationId);
}

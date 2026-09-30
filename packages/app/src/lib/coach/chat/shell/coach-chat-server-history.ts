import type { UIMessage } from 'ai';

/**
 * The body a stored conversation sends to `/api/coach/chat`: its id and the new message only. The
 * route reads the thread and saves the answer (see `coach-chat-history.ts` on the server).
 */
export function serverHistoryRequestBody(input: {
  conversationId: string;
  thread: UIMessage[];
  body: object | undefined;
}): Record<string, unknown> {
  return { ...input.body, conversationId: input.conversationId, message: input.thread.at(-1) };
}

import { safeValidateUIMessages, type UIMessage } from 'ai';
import { dismissUnresolvedCalendarTools } from '@sharpit/app/lib/coach/chat/tools/coach-tool-parts';

/**
 * The conversation a client sends, made safe to hand to the model. Clients own the history
 * (web and iOS each store it), so the route cannot assume its shape.
 */
export type CoachChatHistory = { ok: true; messages: UIMessage[] } | { ok: false };

/**
 * A new question closes the calendar proposals left unanswered, as the web composer already does
 * before sending. Without it, a proposal the athlete ignored reaches the model as a tool call with
 * no result, which the provider rejects: the answer breaks before its first word.
 */
export function closeUnansweredProposals(messages: UIMessage[]): UIMessage[] {
  return messages.at(-1)?.role === 'user' ? dismissUnresolvedCalendarTools(messages) : messages;
}

/** Reads the request body's messages: a malformed conversation is refused, not sent to the model. */
export async function readCoachChatHistory(body: unknown): Promise<CoachChatHistory> {
  const messages = (body as { messages?: unknown } | null)?.messages;
  const validated = await safeValidateUIMessages({ messages });
  if (!validated.success) {
    return { ok: false };
  }
  return { ok: true, messages: closeUnansweredProposals(validated.data) };
}

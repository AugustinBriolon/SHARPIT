import type { QueryClient } from '@tanstack/react-query';
import type { UIMessage } from 'ai';
import { CALENDAR_MUTATION_TOOL_TYPES } from '@/lib/coach/chat/coach-tool-parts';
import { invalidateAfterCoachTools } from '@/lib/coach/chat/coach-chat-cache';

function isCompletedCalendarToolPart(part: {
  type: string;
  state?: string;
  output?: { ok?: boolean };
}): boolean {
  return (
    CALENDAR_MUTATION_TOOL_TYPES.has(part.type) &&
    part.state === 'output-available' &&
    part.output?.ok !== false
  );
}

function completedToolKeysForMessage(message: UIMessage, invalidatedKeys: Set<string>): string[] {
  const keys: string[] = [];
  for (const p of message.parts) {
    if (!p.type.startsWith('tool-')) {
      continue;
    }
    const part = p as { type: string; state?: string; output?: { ok?: boolean } };
    if (!isCompletedCalendarToolPart(part)) {
      continue;
    }
    const key = `${message.id}:${part.type}`;
    if (!invalidatedKeys.has(key)) {
      keys.push(key);
    }
  }
  return keys;
}

export function collectNewlyCompletedToolKeys(
  messages: UIMessage[],
  invalidatedKeys: Set<string>,
): string[] {
  const newlyCompletedKeys: string[] = [];
  for (const m of messages) {
    if (m.role !== 'assistant') {
      continue;
    }
    newlyCompletedKeys.push(...completedToolKeysForMessage(m, invalidatedKeys));
  }
  return newlyCompletedKeys;
}

export function invalidateCompletedCoachTools(
  queryClient: QueryClient,
  messages: UIMessage[],
  invalidatedKeys: Set<string>,
): void {
  const newlyCompletedKeys = collectNewlyCompletedToolKeys(messages, invalidatedKeys);
  if (newlyCompletedKeys.length === 0) {
    return;
  }
  for (const key of newlyCompletedKeys) {
    invalidatedKeys.add(key);
  }
  invalidateAfterCoachTools(queryClient);
}

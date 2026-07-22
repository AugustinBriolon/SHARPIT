import type { UIMessage } from 'ai';

/** True when the thread has an assistant turn worth persisting. */
export function hasPersistableAssistant(messages: UIMessage[]): boolean {
  return messages.some((message) => {
    if (message.role !== 'assistant') return false;
    return message.parts.some((part) => {
      if (part.type === 'text') {
        return Boolean((part as { text?: string }).text?.trim());
      }
      return part.type.startsWith('tool-');
    });
  });
}

/** Cheap fingerprint to avoid redundant PUTs of the same thread. */
export function coachMessagesFingerprint(messages: UIMessage[]): string {
  return messages
    .map((message) => {
      const partsKey = message.parts
        .map((part) => {
          if (part.type === 'text') {
            return `t:${(part as { text?: string }).text?.length ?? 0}`;
          }
          if (part.type.startsWith('tool-')) {
            const state = 'state' in part ? String(part.state ?? '') : '';
            return `${part.type}:${state}`;
          }
          return part.type;
        })
        .join(',');
      return `${message.id}:${message.role}:{${partsKey}}`;
    })
    .join('|');
}

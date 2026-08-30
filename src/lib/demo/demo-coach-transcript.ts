import type { DemoTranscriptMessage } from '@/components/coach/demo-coach-transcript';

function isTextPart(part: unknown): part is { type: 'text'; text: string } {
  return (
    typeof part === 'object' &&
    part !== null &&
    (part as { type?: unknown }).type === 'text' &&
    typeof (part as { text?: unknown }).text === 'string'
  );
}

function textFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) {
    return '';
  }
  return parts
    .filter(isTextPart)
    .map((part) => part.text)
    .join('');
}

function parseTranscriptMessage(entry: unknown): DemoTranscriptMessage | null {
  if (typeof entry !== 'object' || entry === null) {
    return null;
  }
  const { id, role, parts } = entry as Record<string, unknown>;
  if ((role !== 'user' && role !== 'assistant') || typeof id !== 'string') {
    return null;
  }
  const text = textFromParts(parts);
  return text ? { id, role, text } : null;
}

/**
 * The seeded conversation stores real AI SDK UIMessage[] JSON (see
 * seedDemoCoachConversation) — this pulls out just what the read-only demo
 * transcript renders, tolerant of anything unexpected since `messages` is an
 * untyped Prisma Json column.
 */
export function parseDemoTranscriptMessages(raw: unknown): DemoTranscriptMessage[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map(parseTranscriptMessage)
    .filter((message): message is DemoTranscriptMessage => message !== null);
}

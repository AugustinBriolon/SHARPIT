import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import { coachMessagesFingerprint, hasPersistableAssistant } from '@/lib/coach/coach-chat-persist';

function user(text: string): UIMessage {
  return { id: 'u1', role: 'user', parts: [{ type: 'text', text }] };
}

function assistant(text: string): UIMessage {
  return { id: 'a1', role: 'assistant', parts: [{ type: 'text', text }] };
}

describe('hasPersistableAssistant', () => {
  it('returns false for user-only threads', () => {
    expect(hasPersistableAssistant([user('hello')])).toBe(false);
  });

  it('returns true when assistant has text', () => {
    expect(hasPersistableAssistant([user('hello'), assistant('world')])).toBe(true);
  });

  it('returns false for empty assistant text', () => {
    expect(hasPersistableAssistant([user('hello'), assistant('  ')])).toBe(false);
  });

  it('returns true when assistant has a tool part', () => {
    const withTool: UIMessage = {
      id: 'a2',
      role: 'assistant',
      parts: [{ type: 'tool-listPlannedSessions', state: 'output-available', output: [] } as never],
    };
    expect(hasPersistableAssistant([user('hello'), withTool])).toBe(true);
  });
});

describe('coachMessagesFingerprint', () => {
  it('changes when assistant text grows', () => {
    const a = coachMessagesFingerprint([user('hi'), assistant('a')]);
    const b = coachMessagesFingerprint([user('hi'), assistant('ab')]);
    expect(a).not.toBe(b);
  });
});

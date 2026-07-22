import { describe, expect, it } from 'vitest';
import {
  abortChatFetch,
  endAutoReply,
  replaceChatFetchSignal,
  tryBeginAutoReply,
} from '@/lib/coach/coach-chat-request-lock';

describe('coach-chat-request-lock', () => {
  it('allows only one auto-reply per conversation at a time', () => {
    const id = `auto-${crypto.randomUUID()}`;
    expect(tryBeginAutoReply(id)).toBe(true);
    expect(tryBeginAutoReply(id)).toBe(false);
    endAutoReply(id);
    expect(tryBeginAutoReply(id)).toBe(true);
    endAutoReply(id);
  });

  it('aborts the previous chat fetch when a new one starts', () => {
    const id = `fetch-${crypto.randomUUID()}`;
    const first = replaceChatFetchSignal(id);
    expect(first.aborted).toBe(false);
    const second = replaceChatFetchSignal(id);
    expect(first.aborted).toBe(true);
    expect(second.aborted).toBe(false);
    abortChatFetch(id);
    expect(second.aborted).toBe(true);
  });
});

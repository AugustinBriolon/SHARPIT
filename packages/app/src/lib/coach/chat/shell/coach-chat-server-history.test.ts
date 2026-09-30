import type { UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';
import { serverHistoryRequestBody } from '@sharpit/app/lib/coach/chat/shell/coach-chat-server-history';

const thread = [
  { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Comment était ma nuit ?' }] },
  { id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'Courte.' }] },
  { id: 'u2', role: 'user', parts: [{ type: 'text', text: 'Et vendredi ?' }] },
] as UIMessage[];

describe('serverHistoryRequestBody', () => {
  it('sends the conversation id and the last message only', () => {
    expect(serverHistoryRequestBody({ conversationId: 'c1', thread, body: undefined })).toEqual({
      conversationId: 'c1',
      message: thread[2],
    });
  });

  it('keeps the extra body fields the chat was given', () => {
    expect(
      serverHistoryRequestBody({ conversationId: 'c1', thread, body: { locale: 'fr' } }),
    ).toMatchObject({ locale: 'fr', conversationId: 'c1' });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const createMock = vi.fn();
vi.mock('@sharpit/db/client', () => ({
  prisma: { conversation: { create: (...args: unknown[]) => createMock(...args) } },
}));

const { createConversation } = await import('@sharpit/server/lib/coach/conversations');

describe('createConversation', () => {
  beforeEach(() => {
    createMock.mockReset();
    createMock.mockImplementation(async ({ data }: { data: object }) => ({ id: 'c1', ...data }));
  });

  it('creates the conversation from its first question, titled by it', async () => {
    const question = {
      id: 'u1',
      role: 'user',
      parts: [{ type: 'text', text: 'Comment était ma nuit ?' }],
    };

    const conversation = await createConversation('athlete-1', [question]);

    expect(conversation).toMatchObject({
      id: 'c1',
      athleteId: 'athlete-1',
      title: 'Comment était ma nuit ?',
      messages: [question],
    });
  });

  it('refuses a conversation without messages', async () => {
    await expect(createConversation('athlete-1', [])).rejects.toThrow('au moins un message');
    await expect(createConversation('athlete-1', undefined)).rejects.toThrow('au moins un message');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('creates one conversation per request', async () => {
    const question = { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Bonjour' }] };
    await createConversation('athlete-1', [question]);
    await createConversation('athlete-1', [question]);
    expect(createMock).toHaveBeenCalledTimes(2);
  });
});

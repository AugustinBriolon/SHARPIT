import { describe, expect, it, vi } from 'vitest';
import type { UIMessage } from 'ai';
import {
  submitCoachChatMessage,
  type CoachChatSubmitOptions,
} from '@/components/coach/chat/composer/coach-chat-submit';
import { describeCoachDiscussContext } from '@/lib/coach/chat/discuss/coach-discuss-context';

vi.mock('@/lib/coach/chat/composer/coach-input-draft', () => ({
  clearCoachInputDraft: vi.fn(),
}));

const journalChip = describeCoachDiscussContext({ kind: 'journal-analyses' });

function submitOptions(overrides: Partial<CoachChatSubmitOptions> = {}): CoachChatSubmitOptions {
  return {
    text: 'Que dit mon journal ?',
    inputLocked: false,
    guardDisabled: false,
    messages: [],
    isEphemeral: false,
    conversationId: 'conv-1',
    attachedContext: journalChip,
    setShowJumpToLatest: vi.fn(),
    viewportRef: { current: null },
    setMessages: vi.fn(),
    saveMessages: vi.fn().mockResolvedValue(undefined),
    createConversation: { mutateAsync: vi.fn().mockResolvedValue({ id: 'conv-new' }) },
    sendMessage: vi.fn(),
    setInput: vi.fn(),
    onDetachContext: vi.fn(),
    ...overrides,
  };
}

describe('submitCoachChatMessage · discuss metadata', () => {
  it('sends the attached chip kind with the message', async () => {
    const options = submitOptions();

    await submitCoachChatMessage(options);

    expect(options.sendMessage).toHaveBeenCalledWith({
      text: 'Que dit mon journal ?',
      metadata: { discussKind: 'journal-analyses' },
    });
    expect(options.onDetachContext).toHaveBeenCalled();
  });

  it('sends no metadata once the athlete dropped the chip', async () => {
    const options = submitOptions({ attachedContext: null });

    await submitCoachChatMessage(options);

    expect(options.sendMessage).toHaveBeenCalledWith({
      text: 'Que dit mon journal ?',
      metadata: undefined,
    });
  });

  it('persists the chip kind on the first message of a new conversation', async () => {
    const options = submitOptions({ isEphemeral: true });

    await submitCoachChatMessage(options);

    const [{ messages }] = vi.mocked(options.createConversation.mutateAsync).mock.calls[0]!;
    const [first] = messages as UIMessage[];
    expect(first?.metadata).toEqual({ discussKind: 'journal-analyses' });
    expect(options.sendMessage).not.toHaveBeenCalled();
  });

  it('sends the discussed target id, not just the kind', async () => {
    const options = submitOptions({
      text: 'Je suis prêt pour cet objectif ?',
      attachedContext: describeCoachDiscussContext({ kind: 'goal', goalId: 'g-1' }, 'Half'),
    });

    await submitCoachChatMessage(options);

    expect(options.sendMessage).toHaveBeenCalledWith({
      text: 'Je suis prêt pour cet objectif ?',
      metadata: { discussKind: 'goal', goalId: 'g-1' },
    });
  });
});

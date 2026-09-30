import type { UIMessage } from 'ai';
import { describe, expect, it } from 'vitest';
import {
  closeUnansweredProposals,
  readCoachChatHistory,
} from '@sharpit/server/lib/coach/chat/coach-chat-history';

const proposal = {
  type: 'tool-createPlannedSession',
  toolCallId: 'call-1',
  state: 'approval-requested',
  input: { title: 'Seuil' },
  approval: { id: 'approval-1' },
};

function conversation(last: 'user' | 'assistant'): UIMessage[] {
  const messages = [
    { id: 'u1', role: 'user', parts: [{ type: 'text', text: 'Place un seuil jeudi' }] },
    { id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'Je propose :' }, proposal] },
  ] as UIMessage[];
  return last === 'user'
    ? [...messages, { id: 'u2', role: 'user', parts: [{ type: 'text', text: 'Et vendredi ?' }] }]
    : messages;
}

function proposalState(messages: UIMessage[]): string | undefined {
  const part = messages[1]!.parts[1] as { state?: string };
  return part.state;
}

describe('closeUnansweredProposals', () => {
  it('denies a proposal the athlete moved on from', () => {
    expect(proposalState(closeUnansweredProposals(conversation('user')))).toBe('output-denied');
  });

  it('keeps a proposal still waiting on the last coach turn', () => {
    expect(proposalState(closeUnansweredProposals(conversation('assistant')))).toBe(
      'approval-requested',
    );
  });
});

describe('readCoachChatHistory', () => {
  it('accepts a well-formed conversation, with its ignored proposals closed', async () => {
    const history = await readCoachChatHistory({ messages: conversation('user') });
    expect(history.ok).toBe(true);
    expect(history.ok && proposalState(history.messages)).toBe('output-denied');
  });

  it('refuses a body without messages', async () => {
    expect(await readCoachChatHistory({})).toEqual({ ok: false });
    expect(await readCoachChatHistory(null)).toEqual({ ok: false });
  });

  it('refuses a message without parts', async () => {
    expect(await readCoachChatHistory({ messages: [{ id: 'u1', role: 'user' }] })).toEqual({
      ok: false,
    });
  });
});

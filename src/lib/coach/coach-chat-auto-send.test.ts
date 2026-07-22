import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import { lastStepApprovalResponseFingerprint } from '@/lib/coach/coach-chat-auto-send';

function assistant(parts: UIMessage['parts']): UIMessage {
  return { id: 'a1', role: 'assistant', parts };
}

describe('lastStepApprovalResponseFingerprint', () => {
  it('returns null when there is no approval-responded tool', () => {
    expect(
      lastStepApprovalResponseFingerprint([assistant([{ type: 'text', text: 'ok' }])]),
    ).toBeNull();
  });

  it('fingerprints approval ids in the last step only', () => {
    const messages: UIMessage[] = [
      assistant([
        {
          type: 'tool-createPlannedSession',
          toolCallId: 'old',
          state: 'approval-responded',
          input: {},
          approval: { id: 'apr-old', approved: true },
        } as UIMessage['parts'][number],
        { type: 'step-start' },
        {
          type: 'tool-updatePlannedSession',
          toolCallId: 'new',
          state: 'approval-responded',
          input: {},
          approval: { id: 'apr-new', approved: true },
        } as UIMessage['parts'][number],
      ]),
    ];

    expect(lastStepApprovalResponseFingerprint(messages)).toBe('apr-new');
  });

  it('is stable regardless of tool order', () => {
    const a = lastStepApprovalResponseFingerprint([
      assistant([
        {
          type: 'tool-createPlannedSession',
          toolCallId: 't1',
          state: 'approval-responded',
          input: {},
          approval: { id: 'b', approved: true },
        } as UIMessage['parts'][number],
        {
          type: 'tool-deletePlannedSession',
          toolCallId: 't2',
          state: 'approval-responded',
          input: {},
          approval: { id: 'a', approved: true },
        } as UIMessage['parts'][number],
      ]),
    ]);
    const b = lastStepApprovalResponseFingerprint([
      assistant([
        {
          type: 'tool-deletePlannedSession',
          toolCallId: 't2',
          state: 'approval-responded',
          input: {},
          approval: { id: 'a', approved: true },
        } as UIMessage['parts'][number],
        {
          type: 'tool-createPlannedSession',
          toolCallId: 't1',
          state: 'approval-responded',
          input: {},
          approval: { id: 'b', approved: true },
        } as UIMessage['parts'][number],
      ]),
    ]);
    expect(a).toBe('a|b');
    expect(b).toBe('a|b');
  });
});

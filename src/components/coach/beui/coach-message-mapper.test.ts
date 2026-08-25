import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import {
  collectPendingApprovals,
  mapCoachMessages,
  showSubmittedPlaceholder,
} from '@/components/coach/beui/coach-message-mapper';

function userMessage(text: string, id = 'u1'): UIMessage {
  return { id, role: 'user', parts: [{ type: 'text', text }] };
}

function assistantMessage(parts: UIMessage['parts'], id = 'a1'): UIMessage {
  return { id, role: 'assistant', parts };
}

describe('mapCoachMessages', () => {
  it('maps user and assistant rows', () => {
    const messages = [userMessage('Salut'), assistantMessage([{ type: 'text', text: 'Bonjour' }])];
    const rows = mapCoachMessages({
      messages,
      status: 'ready',
      lastAssistantIndex: 1,
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ kind: 'user', text: 'Salut', live: false });
    expect(rows[1]).toMatchObject({
      kind: 'assistant',
      text: 'Bonjour',
      skip: false,
      showProvenance: true,
    });
  });

  it('marks live streaming tail on last assistant message', () => {
    const messages = [assistantMessage([{ type: 'text', text: 'En cours' }])];
    const rows = mapCoachMessages({
      messages,
      status: 'streaming',
      lastAssistantIndex: 0,
    });

    expect(rows[0]).toMatchObject({ kind: 'assistant', live: true, showProvenance: false });
  });

  it('keeps assistant row mounted while approval is pending on that message', () => {
    const messages = [
      assistantMessage([
        {
          type: 'tool-createPlannedSession',
          toolCallId: 'tc-1',
          state: 'approval-requested',
          approval: { id: 'ap-1', isAutomatic: false },
        } as unknown as UIMessage['parts'][number],
      ]),
    ];
    const rows = mapCoachMessages({
      messages,
      status: 'ready',
      lastAssistantIndex: 0,
    });

    expect(rows[0]).toMatchObject({ kind: 'assistant', skip: false });
  });

  it('skips empty assistant rows unless streaming tail', () => {
    const messages = [assistantMessage([])];
    const rows = mapCoachMessages({
      messages,
      status: 'ready',
      lastAssistantIndex: -1,
    });

    expect(rows[0]).toMatchObject({ kind: 'assistant', skip: true });
  });

  it('keeps streaming tail slot without text', () => {
    const messages = [assistantMessage([])];
    const rows = mapCoachMessages({
      messages,
      status: 'streaming',
      lastAssistantIndex: 0,
    });

    expect(rows[0]).toMatchObject({ kind: 'assistant', skip: false, live: true });
  });
});

describe('collectPendingApprovals', () => {
  it('collects manual approval-requested tool parts', () => {
    const messages = [
      assistantMessage([
        {
          type: 'tool-createPlannedSession',
          toolCallId: 'tc-1',
          state: 'approval-requested',
          approval: { id: 'ap-1', isAutomatic: false },
        } as unknown as UIMessage['parts'][number],
      ]),
    ];

    const pending = collectPendingApprovals(messages);
    expect(pending).toHaveLength(1);
    expect(pending[0].approval?.id).toBe('ap-1');
  });

  it('ignores automatic approvals', () => {
    const messages = [
      assistantMessage([
        {
          type: 'tool-createPlannedSession',
          toolCallId: 'tc-2',
          state: 'approval-requested',
          approval: { id: 'ap-2', isAutomatic: true },
        } as unknown as UIMessage['parts'][number],
      ]),
    ];

    expect(collectPendingApprovals(messages)).toHaveLength(0);
  });
});

describe('showSubmittedPlaceholder', () => {
  it('shows when status is submitted and the last message is from the user', () => {
    expect(showSubmittedPlaceholder('submitted', [userMessage('x')])).toBe(true);
    expect(showSubmittedPlaceholder('streaming', [userMessage('x')])).toBe(false);
    expect(showSubmittedPlaceholder('submitted', [])).toBe(false);
    expect(
      showSubmittedPlaceholder('submitted', [
        userMessage('x'),
        { id: 'a1', role: 'assistant', parts: [{ type: 'text', text: '' }] },
      ]),
    ).toBe(false);
  });
});

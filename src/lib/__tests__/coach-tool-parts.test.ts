import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import {
  dismissUnresolvedCalendarTools,
  hasUnresolvedCalendarTools,
  isStaleCalendarToolPart,
} from '@/lib/coach-tool-parts';

function assistantMessage(parts: UIMessage['parts']): UIMessage {
  return { id: 'a1', role: 'assistant', parts };
}

describe('coach-tool-parts', () => {
  it('detects unresolved calendar mutation tools', () => {
    const messages = [
      assistantMessage([
        { type: 'tool-listPlannedSessions', state: 'output-available', output: [] },
        {
          type: 'tool-createPlannedSession',
          state: 'approval-requested',
          input: { title: 'Run' },
          approval: { id: 'appr-1' },
        },
      ] as unknown as UIMessage['parts']),
    ];
    expect(hasUnresolvedCalendarTools(messages)).toBe(true);
  });

  it('dismisses unresolved calendar tools as denied', () => {
    const messages = [
      assistantMessage([
        { type: 'tool-createPlannedSession', state: 'input-available', input: { title: 'Run' } },
        {
          type: 'tool-createPlannedSession',
          state: 'approval-requested',
          input: { title: 'Bike' },
          approval: { id: 'appr-1' },
        },
      ] as unknown as UIMessage['parts']),
    ];

    const dismissed = dismissUnresolvedCalendarTools(messages);
    const tools = dismissed[0].parts.filter((p) => p.type.startsWith('tool-'));

    expect(tools.every((p) => (p as { state?: string }).state === 'output-denied')).toBe(true);
    expect(hasUnresolvedCalendarTools(dismissed)).toBe(false);
  });

  it('marks idle non-terminal calendar tools as stale', () => {
    expect(
      isStaleCalendarToolPart(
        { type: 'tool-createPlannedSession', state: 'input-available' },
        true,
      ),
    ).toBe(true);
    expect(
      isStaleCalendarToolPart(
        { type: 'tool-createPlannedSession', state: 'output-available' },
        true,
      ),
    ).toBe(false);
    expect(
      isStaleCalendarToolPart({ type: 'tool-listPlannedSessions', state: 'input-available' }, true),
    ).toBe(false);
  });
});

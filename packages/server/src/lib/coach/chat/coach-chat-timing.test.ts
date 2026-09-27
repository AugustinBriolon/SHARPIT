import { describe, expect, it } from 'vitest';
import { startCoachChatTiming } from '@sharpit/server/lib/coach/chat/coach-chat-timing';

describe('startCoachChatTiming', () => {
  it('times each phase from the previous one, and the first text from the start', () => {
    let clock = 0;
    const timing = startCoachChatTiming(() => clock);
    clock = 40;
    timing.mark('guard');
    clock = 340;
    timing.mark('prompt');
    timing.note('promptChars', 24_000);
    clock = 5_340;
    timing.firstText();
    clock = 6_000;
    timing.firstText();
    clock = 9_000;
    expect(timing.summary()).toEqual({
      guardMs: 40,
      promptMs: 300,
      promptChars: 24_000,
      firstTextMs: 5_340,
      totalMs: 9_000,
    });
  });
});

import { describe, expect, it } from 'vitest';

import { reasoningTextOf } from '@/lib/coach/chat/coach-reasoning';

describe('reasoningTextOf', () => {
  it('concatenates reasoning deltas in stream order', () => {
    const parts = [
      { type: 'reasoning', text: 'TSB à -12, ' },
      { type: 'reasoning', text: 'readiness basse.' },
    ];
    expect(reasoningTextOf(parts)).toBe('TSB à -12, readiness basse.');
  });

  it('ignores answer text and tool parts', () => {
    const parts = [
      { type: 'reasoning', text: 'je pèse la charge' },
      { type: 'text', text: 'Fais une sortie easy.' },
      { type: 'tool-createPlannedSession' },
    ];
    expect(reasoningTextOf(parts)).toBe('je pèse la charge');
  });

  it('returns an empty string when the turn carries no reasoning', () => {
    expect(reasoningTextOf([{ type: 'text', text: 'Salut' }])).toBe('');
  });
});

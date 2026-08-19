import { describe, expect, it } from 'vitest';

import {
  reasoningSummaryLabel,
  reasoningTextOf,
  shouldAutoExpandReasoning,
} from '@/lib/coach/coach-reasoning';

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

describe('shouldAutoExpandReasoning', () => {
  it('stays closed while reasoning is the only content on screen', () => {
    expect(shouldAutoExpandReasoning({ streaming: true, hasAnswerText: false })).toBe(false);
  });

  it('stays closed as soon as the answer starts arriving', () => {
    expect(shouldAutoExpandReasoning({ streaming: true, hasAnswerText: true })).toBe(false);
  });

  it('stays collapsed on a settled turn', () => {
    expect(shouldAutoExpandReasoning({ streaming: false, hasAnswerText: true })).toBe(false);
    expect(shouldAutoExpandReasoning({ streaming: false, hasAnswerText: false })).toBe(false);
  });
});

describe('reasoningSummaryLabel', () => {
  it('reads as in-progress while the coach is still deliberating', () => {
    expect(reasoningSummaryLabel({ streaming: true, hasAnswerText: false })).toBe(
      'Le coach réfléchit…',
    );
  });

  it('shows elapsed seconds once thinking is done', () => {
    expect(
      reasoningSummaryLabel({ streaming: false, hasAnswerText: true, elapsedSeconds: 5 }),
    ).toBe('A réfléchi pendant 5s');
  });

  it('falls back to generic label without elapsed seconds', () => {
    expect(reasoningSummaryLabel({ streaming: true, hasAnswerText: true })).toBe(
      'Raisonnement du coach',
    );
    expect(reasoningSummaryLabel({ streaming: false, hasAnswerText: false })).toBe(
      'Raisonnement du coach',
    );
  });
});

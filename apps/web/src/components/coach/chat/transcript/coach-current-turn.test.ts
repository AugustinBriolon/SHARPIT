import { describe, expect, it } from 'vitest';
import type { CoachMappedRow } from '@/components/coach/beui/coach-message-mapper';
import { scrollTopToReveal, splitCurrentTurn } from './coach-current-turn';

const row = (kind: 'user' | 'assistant', key: string) =>
  ({ kind, key }) as unknown as CoachMappedRow;

describe('splitCurrentTurn', () => {
  it('starts the turn under way at the last question', () => {
    const { earlier, current } = splitCurrentTurn([
      row('user', 'q1'),
      row('assistant', 'a1'),
      row('user', 'q2'),
      row('assistant', 'a2'),
    ]);
    expect(earlier.map((r) => r.key)).toEqual(['q1', 'a1']);
    expect(current.map((r) => r.key)).toEqual(['q2', 'a2']);
  });

  it('has no turn under way without a question', () => {
    expect(splitCurrentTurn([row('assistant', 'a')])).toEqual({
      earlier: [row('assistant', 'a')],
      current: [],
    });
  });
});

describe('scrollTopToReveal', () => {
  it('puts the target at the top of the viewport, a small gap below its edge', () => {
    const viewport = { scrollTop: 400, getBoundingClientRect: () => ({ top: 100 }) };
    const target = { getBoundingClientRect: () => ({ top: 700 }) };
    expect(scrollTopToReveal(viewport, target)).toBe(992);
  });

  it('never scrolls above the start', () => {
    const viewport = { scrollTop: 0, getBoundingClientRect: () => ({ top: 100 }) };
    const target = { getBoundingClientRect: () => ({ top: 90 }) };
    expect(scrollTopToReveal(viewport, target)).toBe(0);
  });
});

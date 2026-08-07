import { describe, expect, it } from 'vitest';
import { COACH_CONTEXT_GUIDE_AXES } from '@/lib/coach-memory/context-guide';

describe('coach context guide', () => {
  it('covers preference and availability as free-text axes', () => {
    const ids = COACH_CONTEXT_GUIDE_AXES.map((axis) => axis.id);
    expect(ids).toEqual(['availability', 'preference', 'work', 'limits']);
  });
});

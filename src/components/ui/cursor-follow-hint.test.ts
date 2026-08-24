import { describe, expect, it } from 'vitest';
import { placeCursorHint } from './cursor-follow-hint';

describe('placeCursorHint', () => {
  it('sits above and to the right of the cursor when there is room', () => {
    expect(placeCursorHint(100, 120, 160, 48, { w: 800, h: 600 })).toEqual({
      left: 112,
      top: 60,
    });
  });

  it('flips to the left when the cursor is on the right edge', () => {
    const placed = placeCursorHint(780, 120, 160, 48, { w: 800, h: 600 });
    expect(placed.left).toBe(608);
    expect(placed.top).toBe(60);
  });
});

import { describe, expect, it } from 'vitest';

import {
  distanceFromBottom,
  isNearBottom,
  shouldShowJumpToLatest,
  STICK_TO_BOTTOM_THRESHOLD_PX,
} from '@/lib/coach/scroll-anchor';

const tallTranscript = { scrollHeight: 2000, clientHeight: 600 };
/** scrollTop at which the tail is exactly flush with the viewport bottom. */
const atBottom = tallTranscript.scrollHeight - tallTranscript.clientHeight;

describe('distanceFromBottom', () => {
  it('measures the gap between the tail and the viewport bottom', () => {
    expect(distanceFromBottom({ ...tallTranscript, scrollTop: atBottom - 300 })).toBe(300);
  });

  it('clamps overscroll to zero rather than reporting a negative gap', () => {
    expect(distanceFromBottom({ ...tallTranscript, scrollTop: atBottom + 120 })).toBe(0);
  });

  it('reports zero when the transcript is shorter than its viewport', () => {
    expect(distanceFromBottom({ scrollTop: 0, scrollHeight: 200, clientHeight: 600 })).toBe(0);
  });
});

describe('isNearBottom', () => {
  it('stays stuck within the threshold, so streaming keeps following the tail', () => {
    const geometry = {
      ...tallTranscript,
      scrollTop: atBottom - (STICK_TO_BOTTOM_THRESHOLD_PX - 1),
    };
    expect(isNearBottom(geometry)).toBe(true);
  });

  it('treats the threshold itself as still stuck', () => {
    const geometry = { ...tallTranscript, scrollTop: atBottom - STICK_TO_BOTTOM_THRESHOLD_PX };
    expect(isNearBottom(geometry)).toBe(true);
  });

  it('disengages once the athlete scrolls past the threshold', () => {
    const geometry = {
      ...tallTranscript,
      scrollTop: atBottom - (STICK_TO_BOTTOM_THRESHOLD_PX + 1),
    };
    expect(isNearBottom(geometry)).toBe(false);
  });

  it('keeps a transcript shorter than its viewport stuck', () => {
    expect(isNearBottom({ scrollTop: 0, scrollHeight: 200, clientHeight: 600 })).toBe(true);
  });
});

describe('shouldShowJumpToLatest', () => {
  it('offers the jump only once the athlete has scrolled away', () => {
    expect(shouldShowJumpToLatest({ stuck: false, hasMessages: true })).toBe(true);
  });

  it('hides the jump while the tail is already followed', () => {
    expect(shouldShowJumpToLatest({ stuck: true, hasMessages: true })).toBe(false);
  });

  it('hides the jump on an empty transcript', () => {
    expect(shouldShowJumpToLatest({ stuck: false, hasMessages: false })).toBe(false);
  });
});

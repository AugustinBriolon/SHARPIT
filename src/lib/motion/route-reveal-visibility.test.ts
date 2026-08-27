import { describe, expect, it } from 'vitest';
import {
  ROUTE_REVEAL_VISIBILITY_RATIO,
  shouldStartRouteReveal,
} from '@/lib/motion/route-reveal-visibility';

describe('shouldStartRouteReveal', () => {
  it('waits until enough of the map is on-screen to actually watch the draw', () => {
    expect(shouldStartRouteReveal(0)).toBe(false);
    expect(shouldStartRouteReveal(0.19)).toBe(false);
    expect(shouldStartRouteReveal(0.2)).toBe(false);
    expect(shouldStartRouteReveal(ROUTE_REVEAL_VISIBILITY_RATIO - 0.01)).toBe(false);
  });

  it('starts once the map is mostly in view', () => {
    expect(shouldStartRouteReveal(ROUTE_REVEAL_VISIBILITY_RATIO)).toBe(true);
    expect(shouldStartRouteReveal(0.8)).toBe(true);
    expect(shouldStartRouteReveal(1)).toBe(true);
  });
});

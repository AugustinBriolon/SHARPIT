import { describe, expect, it } from 'vitest';
import {
  REVEAL_DURATION_MAX_MS,
  REVEAL_DURATION_MIN_MS,
  easeOutCubic,
  isRevealComplete,
  revealDurationMs,
  revealedPointCount,
} from '@/lib/motion/route-reveal';

describe('easeOutCubic', () => {
  it('starts at 0 and ends at 1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it('clamps out-of-range progress', () => {
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
  });

  it('runs ahead of a linear ramp before the finish — the "ease out" part', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe('revealedPointCount', () => {
  it('reveals nothing more than the two points a short segment has', () => {
    expect(revealedPointCount(0, 900, 2)).toBe(2);
    expect(revealedPointCount(900, 900, 2)).toBe(2);
  });

  it('never shows fewer than 2 points once there is a line at all', () => {
    expect(revealedPointCount(0, 900, 500)).toBeGreaterThanOrEqual(2);
  });

  it('shows every point once the duration has elapsed', () => {
    expect(revealedPointCount(900, 900, 500)).toBe(500);
    expect(revealedPointCount(5000, 900, 500)).toBe(500);
  });

  it('grows monotonically as time passes', () => {
    const counts = [0, 150, 300, 450, 600, 750, 900].map((t) => revealedPointCount(t, 900, 200));
    for (let i = 1; i < counts.length; i += 1) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    }
    expect(counts[0]).toBe(2);
    expect(counts[counts.length - 1]).toBe(200);
  });

  it('passes through a lone point or an empty route unchanged', () => {
    expect(revealedPointCount(0, 900, 1)).toBe(1);
    expect(revealedPointCount(0, 900, 0)).toBe(0);
  });
});

describe('isRevealComplete', () => {
  it('is false before the duration and true at or after it', () => {
    expect(isRevealComplete(899, 900)).toBe(false);
    expect(isRevealComplete(900, 900)).toBe(true);
    expect(isRevealComplete(1200, 900)).toBe(true);
  });
});

describe('revealDurationMs', () => {
  it('stays in the 3s–5s band the athlete can actually watch', () => {
    expect(REVEAL_DURATION_MIN_MS).toBe(3000);
    expect(REVEAL_DURATION_MAX_MS).toBe(5000);
    expect(revealDurationMs(2)).toBe(REVEAL_DURATION_MIN_MS);
    expect(revealDurationMs(10_000)).toBe(REVEAL_DURATION_MAX_MS);
  });

  it('gives short routes the floor and long routes the ceiling', () => {
    expect(revealDurationMs(50)).toBe(REVEAL_DURATION_MIN_MS);
    expect(revealDurationMs(80)).toBe(REVEAL_DURATION_MIN_MS);
    expect(revealDurationMs(800)).toBe(REVEAL_DURATION_MAX_MS);
    expect(revealDurationMs(2000)).toBe(REVEAL_DURATION_MAX_MS);
  });

  it('scales between the floors as point count grows', () => {
    const mid = revealDurationMs(440);
    expect(mid).toBeGreaterThan(REVEAL_DURATION_MIN_MS);
    expect(mid).toBeLessThan(REVEAL_DURATION_MAX_MS);
    expect(revealDurationMs(200)).toBeLessThan(revealDurationMs(600));
  });
});

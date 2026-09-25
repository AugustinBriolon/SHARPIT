import { describe, expect, it } from 'vitest';
import {
  COACH_GENERATION_STATUS_STEP_MS,
  COACH_GENERATION_STATUS_STEPS,
  coachGenerationStatusCopy,
} from '@/lib/coach/plan/generation-status-copy';

describe('coachGenerationStatusCopy', () => {
  it('returns exactly one progressive line and rotates through consultation phases', () => {
    const seen = new Set<string>();
    for (let i = 0; i < COACH_GENERATION_STATUS_STEPS.length; i += 1) {
      const copy = coachGenerationStatusCopy({
        elapsedMs: i * COACH_GENERATION_STATUS_STEP_MS,
        partialCount: 0,
        itemNoun: 'séance',
      });
      expect(copy.includes('\n')).toBe(false);
      expect(seen.has(copy)).toBe(false);
      seen.add(copy);
      expect(copy).toBe(COACH_GENERATION_STATUS_STEPS[i]);
    }
    expect(seen.size).toBe(COACH_GENERATION_STATUS_STEPS.length);
  });

  it('cycles after the last phase for long waits', () => {
    const cycleMs = COACH_GENERATION_STATUS_STEP_MS * COACH_GENERATION_STATUS_STEPS.length;
    expect(
      coachGenerationStatusCopy({
        elapsedMs: cycleMs,
        partialCount: 0,
        itemNoun: 'séance',
      }),
    ).toBe(COACH_GENERATION_STATUS_STEPS[0]);
  });

  it('prefers drafting count over phase rotation (single status exclusivity)', () => {
    expect(
      coachGenerationStatusCopy({
        elapsedMs: 0,
        partialCount: 2,
        itemNoun: 'séance',
      }),
    ).toBe('2 séances en cours de rédaction…');
    expect(
      coachGenerationStatusCopy({
        elapsedMs: 12_000,
        partialCount: 1,
        itemNoun: 'ajustement',
      }),
    ).toBe('1 ajustement en cours de rédaction…');
  });
});

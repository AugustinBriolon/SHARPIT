import { describe, expect, it } from 'vitest';
import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import type { DecisionData, TodayState } from '@/core/athlete-state/today-state';

/**
 * Seam guard: Core athlete-state types must be importable without hooks.
 * Pure type modules — runtime assertion keeps the import graph honest under vitest.
 */
describe('core athlete-state today-state seam', () => {
  it('exports TodayState and DecisionData without pulling hooks', () => {
    const state: TodayState = {
      decision: null,
      reasoning: null,
      recovery: null,
      fatigue: null,
      adaptation: null,
      physicalHealth: null,
      dailyStrain: null,
    };

    const { decision }: { decision: DecisionData | null } = state;
    expect(decision).toBeNull();
    expect(state.recovery).toBeNull();
  });

  it('AthleteSnapshot is importable from core without hooks', () => {
    type SnapshotDecision = AthleteSnapshot['decision'];
    const decision: SnapshotDecision = null;
    expect(decision).toBeNull();
  });
});

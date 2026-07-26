import { describe, expect, it } from 'vitest';
import { resolveDefaultPlanGoalId } from './plan-goal';

describe('resolveDefaultPlanGoalId', () => {
  it('returns the active plan goal when it is selectable', () => {
    expect(resolveDefaultPlanGoalId('goal-a', ['goal-a', 'goal-b'])).toBe('goal-a');
  });

  it('returns null when plan has no goal or it is not selectable', () => {
    expect(resolveDefaultPlanGoalId(null, ['goal-a'])).toBeNull();
    expect(resolveDefaultPlanGoalId('goal-x', ['goal-a'])).toBeNull();
  });
});

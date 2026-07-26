import { describe, expect, it } from 'vitest';
import { resolveDefaultPlanGoalId, selectableDatedGoalIds } from './plan-goal';

describe('resolveDefaultPlanGoalId', () => {
  it('returns the active plan goal when it is selectable', () => {
    expect(resolveDefaultPlanGoalId('goal-a', ['goal-a', 'goal-b'])).toBe('goal-a');
  });

  it('returns null when plan has no goal or it is not selectable', () => {
    expect(resolveDefaultPlanGoalId(null, ['goal-a'])).toBeNull();
    expect(resolveDefaultPlanGoalId('goal-x', ['goal-a'])).toBeNull();
  });
});

describe('selectableDatedGoalIds', () => {
  const now = new Date('2026-07-15T12:00:00Z');

  it('keeps only non-achieved goals with a target date on or after now', () => {
    expect(
      selectableDatedGoalIds(
        [
          { id: 'a', achieved: false, targetDate: new Date('2026-08-01') },
          { id: 'b', achieved: true, targetDate: new Date('2026-08-01') },
          { id: 'c', achieved: false, targetDate: new Date('2026-07-01') },
          { id: 'd', achieved: false, targetDate: null },
        ],
        now,
      ),
    ).toEqual(['a']);
  });
});

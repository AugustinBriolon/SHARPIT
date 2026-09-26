import { describe, expect, it } from 'vitest';
import {
  canBeHabitPriorityLever,
  habitOutcomePlausibility,
} from '@sharpit/app/lib/journal/journal-habit-priors';

describe('habitOutcomePlausibility', () => {
  it('ranks sleep-hygiene levers as primary for sleep', () => {
    expect(habitOutcomePlausibility('late_meal', 'sleepMinutes')).toBe('primary');
    expect(habitOutcomePlausibility('device_in_bed', 'sleepMinutes')).toBe('primary');
    expect(habitOutcomePlausibility('alcohol', 'sleepMinutes')).toBe('primary');
  });

  it('keeps probiotics exploratory for sleep and recovery', () => {
    expect(habitOutcomePlausibility('probiotic', 'sleepMinutes')).toBe('exploratory');
    expect(habitOutcomePlausibility('probiotic', 'recoveryScore')).toBe('exploratory');
    expect(canBeHabitPriorityLever('probiotic', 'sleepMinutes')).toBe(false);
  });

  it('allows creatine as a secondary recovery lever, not sleep', () => {
    expect(habitOutcomePlausibility('creatine', 'recoveryScore')).toBe('secondary');
    expect(habitOutcomePlausibility('creatine', 'sleepMinutes')).toBe('exploratory');
    expect(canBeHabitPriorityLever('creatine', 'recoveryScore')).toBe(true);
  });
});

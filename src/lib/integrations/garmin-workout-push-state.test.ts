import { describe, expect, it } from 'vitest';
import {
  buildAlreadyPushedError,
  garminPushClearOnSessionChange,
  isGarminPushBlockReason,
} from '@/lib/integrations/garmin-workout-push-state';

describe('garmin-workout-push-state', () => {
  it('builds a clear already-pushed payload', () => {
    const block = buildAlreadyPushedError({
      receipt: {
        workoutId: '42',
        scheduledDate: '2026-07-24',
        pushedAt: '2026-07-24T10:00:00.000Z',
      },
      workoutExists: true,
      calendarActive: true,
    });
    expect(block.code).toBe('ALREADY_PUSHED');
    expect(block.message).toContain('Renvoyer');
    expect(isGarminPushBlockReason(block)).toBe(true);
  });

  it('clears receipt when prescription or date changes', () => {
    expect(garminPushClearOnSessionChange({})).toBeNull();
    expect(
      garminPushClearOnSessionChange({ strengthPrescription: { version: 1, sets: [] } }),
    ).toEqual({
      garminWorkoutId: null,
      garminWorkoutScheduledDate: null,
      garminWorkoutPushedAt: null,
    });
    expect(garminPushClearOnSessionChange({ date: new Date() })).toEqual({
      garminWorkoutId: null,
      garminWorkoutScheduledDate: null,
      garminWorkoutPushedAt: null,
    });
  });
});

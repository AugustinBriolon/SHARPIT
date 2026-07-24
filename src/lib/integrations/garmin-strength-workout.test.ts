import { describe, expect, it } from 'vitest';
import {
  invertGarminExerciseLabelsFr,
  resolveGarminExerciseRef,
} from '@/lib/integrations/garmin-exercise-map';
import { buildStrengthWorkoutPayload } from '@/lib/integrations/garmin-strength-workout-payload';

describe('resolveGarminExerciseRef', () => {
  it('maps FR labels and catalog ids', () => {
    expect(resolveGarminExerciseRef({ exercise: 'Pompe' })).toEqual({
      category: 'PUSH_UP',
      exerciseName: 'PUSH_UP',
    });
    expect(resolveGarminExerciseRef({ exercise: 'inconnu', exerciseCatalogId: '0025' })).toEqual({
      category: 'BENCH_PRESS',
      exerciseName: 'BARBELL_BENCH_PRESS',
    });
  });

  it('uses inverted FR Garmin properties when provided', () => {
    const fr = new Map([['exercise_type_BARBELL_BENCH_PRESS', 'Développé couché barre']]);
    const leafByLabel = invertGarminExerciseLabelsFr(fr);
    expect(
      resolveGarminExerciseRef({
        exercise: 'Développé couché barre',
        frLeafByLabel: leafByLabel,
      }),
    ).toEqual({
      category: 'BENCH_PRESS',
      exerciseName: 'BARBELL_BENCH_PRESS',
    });
  });

  it('maps mobility / stretch FR labels used in rehab sessions', () => {
    expect(resolveGarminExerciseRef({ exercise: 'Étirement 90/90' })).toEqual({
      category: 'WARM_UP',
      exerciseName: 'STRETCH_90_90',
    });
    expect(resolveGarminExerciseRef({ exercise: 'Étirement chat et vache' })).toEqual({
      category: 'WARM_UP',
      exerciseName: 'STRETCH_CAT_COW',
    });
    expect(resolveGarminExerciseRef({ exercise: "Étirement posture de l'enfant" })).toEqual({
      category: 'WARM_UP',
      exerciseName: 'STRETCH_CHILDS_POSE',
    });
    expect(resolveGarminExerciseRef({ exercise: 'Clamshell avec élastique' })).toEqual({
      category: 'BANDED_EXERCISES',
      exerciseName: 'CLAM_SHELLS',
    });
    expect(resolveGarminExerciseRef({ exercise: 'Auto-massage (Foam roller)' })).toEqual({
      category: 'MOVE',
      exerciseName: 'BACK_MASSAGE',
    });
    expect(resolveGarminExerciseRef({ exercise: 'Glissement du nerf sciatique' })).toEqual({
      category: 'WARM_UP',
      exerciseName: 'STRETCH_PIRIFORMIS',
    });
  });
});

describe('buildStrengthWorkoutPayload', () => {
  it('builds a repeat group with reps and rest', () => {
    const { payload, mappedCount, skipped } = buildStrengthWorkoutPayload({
      workoutName: 'Upper',
      sets: [
        {
          exercise: 'Pompe',
          sets: 3,
          reps: 10,
          restSec: 90,
          garmin: { category: 'PUSH_UP', exerciseName: 'PUSH_UP' },
        },
      ],
    });

    expect(mappedCount).toBe(1);
    expect(skipped).toEqual([]);
    expect(payload.sportType).toMatchObject({ sportTypeKey: 'strength_training' });

    const [segment] = payload.workoutSegments as Array<{ workoutSteps: unknown[] }>;
    const [group] = segment.workoutSteps as Array<{
      type: string;
      numberOfIterations: number;
      workoutSteps: Array<{
        category?: string;
        exerciseName?: string;
        endCondition: { conditionTypeKey: string };
        endConditionValue: number;
      }>;
    }>;

    expect(group.type).toBe('RepeatGroupDTO');
    expect(group.numberOfIterations).toBe(3);
    expect(group.workoutSteps[0]).toMatchObject({
      category: 'PUSH_UP',
      exerciseName: 'PUSH_UP',
      endCondition: { conditionTypeKey: 'reps' },
      endConditionValue: 10,
    });
    expect(group.workoutSteps[1]).toMatchObject({
      endCondition: { conditionTypeKey: 'time' },
      endConditionValue: 90,
    });
  });

  it('uses time end condition for isometric sets without reps', () => {
    const { payload } = buildStrengthWorkoutPayload({
      workoutName: 'Core',
      sets: [
        {
          exercise: 'Planche',
          sets: 1,
          reps: 0,
          durationSec: 60,
          garmin: { category: 'PLANK', exerciseName: 'PLANK' },
        },
      ],
    });

    const [segment] = payload.workoutSegments as Array<{ workoutSteps: unknown[] }>;
    const [step] = segment.workoutSteps as Array<{
      endCondition: { conditionTypeKey: string };
      endConditionValue: number;
    }>;
    expect(step.endCondition.conditionTypeKey).toBe('time');
    expect(step.endConditionValue).toBe(60);
  });

  it('falls back to UNKNOWN for unmapped exercises instead of dropping them', () => {
    const { mappedCount, skipped, payload } = buildStrengthWorkoutPayload({
      workoutName: 'Mixed',
      sets: [
        { exercise: 'Mouvement inventé', sets: 2, reps: 8, garmin: null },
        {
          exercise: 'Squat',
          sets: 2,
          reps: 5,
          garmin: { category: 'SQUAT', exerciseName: 'SQUAT' },
        },
      ],
    });
    expect(mappedCount).toBe(2);
    expect(skipped).toEqual([
      { exercise: 'Mouvement inventé', reason: 'envoyé comme Inconnu (pas de match Garmin)' },
    ]);
    const [segment] = payload.workoutSegments as Array<{ workoutSteps: unknown[] }>;
    const [unknownStep] = segment.workoutSteps as Array<{
      category?: string;
      exerciseName?: string;
      description?: string;
      workoutSteps?: Array<{ category?: string; exerciseName?: string; description?: string }>;
    }>;
    // Repeat group when sets>1
    const active = unknownStep.workoutSteps?.[0] ?? unknownStep;
    expect(active).toMatchObject({
      category: 'UNKNOWN',
      exerciseName: 'UNKNOWN',
      description: 'Mouvement inventé',
    });
  });
});

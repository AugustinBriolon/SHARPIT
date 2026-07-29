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
    // Bodyweight dips: Connect parent is SUSPENSION (DIP category is rejected by createWorkout)
    expect(resolveGarminExerciseRef({ exercise: 'Dip avec poids du corps' })).toEqual({
      category: 'SUSPENSION',
      exerciseName: 'DIP',
    });
    expect(resolveGarminExerciseRef({ exercise: 'Auto-massage (Foam roller)' })).toBeNull();
    expect(resolveGarminExerciseRef({ exercise: 'Glissement du nerf sciatique' })).toEqual({
      category: 'WARM_UP',
      exerciseName: 'STRETCH_PIRIFORMIS',
    });
  });
});

describe('buildStrengthWorkoutPayload', () => {
  it('builds a repeat group with reps and Lap rest after every set including last', () => {
    const { payload, mappedCount, skipped } = buildStrengthWorkoutPayload({
      workoutName: 'Upper',
      sets: [
        {
          exercise: 'Pompe',
          sets: 3,
          reps: 10,
          restMode: 'lap',
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
      skipLastRestStep: boolean;
      workoutSteps: Array<{
        category?: string;
        exerciseName?: string;
        endCondition: { conditionTypeKey: string; conditionTypeId?: number };
        endConditionValue: number | null;
      }>;
    }>;

    expect(group.type).toBe('RepeatGroupDTO');
    expect(group.numberOfIterations).toBe(3);
    expect(group.skipLastRestStep).toBe(false);
    expect(group.workoutSteps[0]).toMatchObject({
      category: 'PUSH_UP',
      exerciseName: 'PUSH_UP',
      endCondition: { conditionTypeKey: 'reps' },
      endConditionValue: 10,
    });
    expect(group.workoutSteps[1]).toMatchObject({
      endCondition: { conditionTypeKey: 'lap.button', conditionTypeId: 1 },
      endConditionValue: null,
    });
  });

  it('uses timed rest when restMode is time', () => {
    const { payload } = buildStrengthWorkoutPayload({
      workoutName: 'Upper',
      sets: [
        {
          exercise: 'Pompe',
          sets: 2,
          reps: 10,
          restMode: 'time',
          restSec: 90,
          garmin: { category: 'PUSH_UP', exerciseName: 'PUSH_UP' },
        },
      ],
    });
    const [segment] = payload.workoutSegments as Array<{ workoutSteps: unknown[] }>;
    const [group] = segment.workoutSteps as Array<{
      workoutSteps: Array<{
        endCondition: { conditionTypeKey: string };
        endConditionValue: number;
      }>;
    }>;
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
    const [group] = segment.workoutSteps as Array<{
      workoutSteps: Array<{
        endCondition: { conditionTypeKey: string };
        endConditionValue: number | null;
      }>;
    }>;
    expect(group.workoutSteps[0].endCondition.conditionTypeKey).toBe('time');
    expect(group.workoutSteps[0].endConditionValue).toBe(60);
    expect(group.workoutSteps[1].endCondition.conditionTypeKey).toBe('lap.button');
  });

  it('skips unmapped exercises instead of sending invalid UNKNOWN category', () => {
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
    expect(mappedCount).toBe(1);
    expect(skipped).toEqual([
      {
        exercise: 'Mouvement inventé',
        reason: 'hors catalogue montre (catégorie Garmin invalide ou inconnue)',
      },
    ]);
    const [segment] = payload.workoutSegments as Array<{ workoutSteps: unknown[] }>;
    expect(segment.workoutSteps).toHaveLength(1);
  });

  it('rewrites stale DIP category to SUSPENSION (Connect Invalid category)', () => {
    const { mappedCount, skipped, payload } = buildStrengthWorkoutPayload({
      workoutName: 'Street',
      sets: [
        {
          exercise: 'Dip avec poids du corps',
          sets: 3,
          reps: 11,
          // Persisted alias bug — category DIP is not accepted by createWorkout
          garmin: { category: 'DIP', exerciseName: 'DIP' },
        },
      ],
    });
    expect(mappedCount).toBe(1);
    expect(skipped).toEqual([]);
    const [segment] = payload.workoutSegments as Array<{ workoutSteps: unknown[] }>;
    const [group] = segment.workoutSteps as Array<{
      workoutSteps: Array<{ category?: string; exerciseName?: string }>;
    }>;
    expect(group.workoutSteps[0]).toMatchObject({
      category: 'SUSPENSION',
      exerciseName: 'DIP',
    });
  });

  it('accepts the prod Street Workout session categories after canonicalize', () => {
    const { mappedCount, skipped, payload } = buildStrengthWorkoutPayload({
      workoutName: 'Street Workout & Mobilité Hanches',
      sets: [
        {
          exercise: 'Pompe',
          sets: 1,
          reps: 20,
          garmin: { category: 'PUSH_UP', exerciseName: 'PUSH_UP' },
        },
        {
          exercise: 'Traction',
          sets: 1,
          reps: 5,
          garmin: { category: 'PULL_UP', exerciseName: 'PULL_UP' },
        },
        {
          exercise: 'Dip avec poids du corps',
          sets: 1,
          reps: 8,
          garmin: { category: 'DIP', exerciseName: 'DIP' },
        },
        {
          exercise: 'Traction',
          sets: 3,
          reps: 10,
          restSec: 90,
          restMode: 'time',
          garmin: { category: 'PULL_UP', exerciseName: 'PULL_UP' },
        },
        {
          exercise: 'Dip avec poids du corps',
          sets: 3,
          reps: 11,
          restSec: 90,
          restMode: 'time',
          garmin: { category: 'DIP', exerciseName: 'DIP' },
        },
        {
          exercise: 'Étirement 90/90',
          sets: 3,
          reps: 0,
          durationSec: 60,
          garmin: { category: 'WARM_UP', exerciseName: 'STRETCH_90_90' },
        },
        {
          exercise: 'Clamshell avec élastique',
          sets: 3,
          reps: 20,
          garmin: { category: 'BANDED_EXERCISES', exerciseName: 'CLAM_SHELLS' },
        },
        {
          exercise: 'Étirement chat et vache',
          sets: 2,
          reps: 10,
          garmin: { category: 'WARM_UP', exerciseName: 'STRETCH_CAT_COW' },
        },
      ],
    });

    expect(mappedCount).toBe(8);
    expect(skipped).toEqual([]);
    const [segment] = payload.workoutSegments as Array<{ workoutSteps: unknown[] }>;
    const categories = (
      segment.workoutSteps as Array<{
        workoutSteps: Array<{ category?: string; exerciseName?: string }>;
      }>
    ).map((g) => `${g.workoutSteps[0].category}/${g.workoutSteps[0].exerciseName}`);
    expect(categories).toEqual([
      'PUSH_UP/PUSH_UP',
      'PULL_UP/PULL_UP',
      'SUSPENSION/DIP',
      'PULL_UP/PULL_UP',
      'SUSPENSION/DIP',
      'WARM_UP/STRETCH_90_90',
      'BANDED_EXERCISES/CLAM_SHELLS',
      'WARM_UP/STRETCH_CAT_COW',
    ]);
  });
});

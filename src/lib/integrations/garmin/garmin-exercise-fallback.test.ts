import { describe, expect, it } from 'vitest';
import { resolveGarminExerciseFallback } from '@/lib/integrations/garmin/garmin-exercise-fallback';
import { resolveGarminExerciseMatch } from '@/lib/integrations/garmin/garmin-exercise-map';
import { buildStrengthWorkoutPayload } from '@/lib/integrations/garmin/garmin-strength-workout-payload';
import { attachGarminRefsToPrescription } from '@/lib/planned-session/strength/strength-prescription';

/**
 * Real prehab session pushed to the watch: 6 exercises prescribed, only 2 arrived.
 * Every label here must reach Connect — approximate names allowed, silence not.
 */
const HIP_REHAB_SESSION = [
  'Massage Piriforme avec Boule de massage',
  'Nerve Flossing Sciatique (Assis)',
  'Pont fessier avec élastique et bascule du bassin',
  'Clamshell avec élastique (Excentrique)',
  'Deadlift jambes tendues (Brique entre les genoux)',
  'Gainage Planche Hollow Body (Rétroversion)',
];

describe('movement-family fallback', () => {
  it('never leaves a non-empty label unresolved', () => {
    for (const label of [...HIP_REHAB_SESSION, 'Exercice totalement inventé zzz']) {
      expect(resolveGarminExerciseFallback(label), label).not.toBeNull();
    }
    expect(resolveGarminExerciseFallback('   ')).toBeNull();
  });

  it('routes soft-tissue and nerve work to the matching stretch', () => {
    expect(resolveGarminExerciseFallback('Nerve Flossing Sciatique')?.ref).toEqual({
      category: 'WARM_UP',
      exerciseName: 'STRETCH_PIRIFORMIS',
    });
    expect(resolveGarminExerciseFallback('Massage ischios avec balle')?.ref).toEqual({
      category: 'WARM_UP',
      exerciseName: 'STRETCH_HAMSTRING',
    });
  });
});

describe('hip rehab session mapping (regression)', () => {
  it('resolves every prescribed exercise', () => {
    const resolved = HIP_REHAB_SESSION.map((exercise) => ({
      exercise,
      match: resolveGarminExerciseMatch({ exercise }),
    }));
    expect(resolved.filter((r) => r.match == null)).toEqual([]);
  });

  it('picks the specific catalog entry when one exists', () => {
    expect(
      resolveGarminExerciseMatch({ exercise: 'Pont fessier avec élastique et bascule du bassin' })
        ?.ref,
    ).toEqual({ category: 'BANDED_EXERCISES', exerciseName: 'BANDED_EXERCISES_GLUTE_BRIDGE' });
    expect(
      resolveGarminExerciseMatch({ exercise: 'Deadlift jambes tendues (Brique entre les genoux)' })
        ?.ref.exerciseName,
    ).toContain('STRAIGHT_LEG_DEADLIFT');
    expect(
      resolveGarminExerciseMatch({ exercise: 'Gainage Planche Hollow Body (Rétroversion)' })?.ref
        .category,
    ).toBe('PLANK');
  });

  it('sends all six exercises to Connect, none skipped', () => {
    const prescription = attachGarminRefsToPrescription({
      version: 1,
      sets: HIP_REHAB_SESSION.map((exercise, order) => ({
        exercise,
        sets: 3,
        reps: 15,
        order,
        restMode: 'lap' as const,
      })),
    });

    const built = buildStrengthWorkoutPayload({
      workoutName: 'Prehab hanche',
      sets: prescription.sets.map((set) => ({
        exercise: set.exercise,
        sets: set.sets,
        reps: set.reps,
        restMode: set.restMode,
        garmin: set.garmin,
      })),
    });

    expect(built.skipped).toEqual([]);
    expect(built.mappedCount).toBe(HIP_REHAB_SESSION.length);
    expect(built.mapped.map((step) => step.exercise)).toEqual(HIP_REHAB_SESSION);
    for (const step of built.mapped) {
      expect(step.watchLabel.length, step.exercise).toBeGreaterThan(0);
    }
  });

  it('holds mobility steps for a duration instead of a single rep', () => {
    const built = buildStrengthWorkoutPayload({
      workoutName: 'Mobilité',
      sets: [
        {
          exercise: 'Massage Piriforme avec Boule de massage',
          sets: 1,
          reps: 1,
          garmin: { category: 'WARM_UP', exerciseName: 'STRETCH_PIRIFORMIS' },
        },
      ],
    });

    const [segment] = built.payload.workoutSegments as Array<{ workoutSteps: unknown[] }>;
    const [group] = segment.workoutSteps as Array<{
      workoutSteps: Array<{
        endCondition: { conditionTypeKey: string };
        endConditionValue: number | null;
        description?: string;
      }>;
    }>;
    expect(group.workoutSteps[0].endCondition.conditionTypeKey).toBe('time');
    expect(group.workoutSteps[0].endConditionValue).toBe(45);
    // The athlete's own wording still rides along on the step.
    expect(group.workoutSteps[0].description).toBe('Massage Piriforme avec Boule de massage');
  });
});

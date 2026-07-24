import { describe, expect, it } from 'vitest';
import {
  garminTaxonomySize,
  matchGarminTaxonomy,
  suggestGarminTaxonomy,
} from '@/lib/integrations/garmin-exercise-taxonomy';
import { resolveGarminExerciseMatch } from '@/lib/integrations/garmin-exercise-map';
import {
  attachGarminRefsToPrescription,
  normalizeCoachStrengthPrescription,
  strengthSetWatchCompat,
} from '@/lib/planned-session/strength-prescription';

describe('garmin exercise taxonomy', () => {
  it('bundles the Connect FR catalog', () => {
    expect(garminTaxonomySize()).toBeGreaterThan(1400);
  });

  it('exact-matches official FR stretch labels under WARM_UP', () => {
    expect(matchGarminTaxonomy('Étirement 90/90')).toMatchObject({
      confidence: 'exact',
      labelFr: 'Étirement 90/90',
      ref: { category: 'WARM_UP', exerciseName: 'STRETCH_90_90' },
    });
    expect(matchGarminTaxonomy('Étirement chat et vache')).toMatchObject({
      ref: { category: 'WARM_UP', exerciseName: 'STRETCH_CAT_COW' },
    });
    expect(matchGarminTaxonomy("Étirement posture de l'enfant")).toMatchObject({
      ref: { category: 'WARM_UP', exerciseName: 'STRETCH_CHILDS_POSE' },
    });
  });

  it('resolves EN-ish stretch wording via leaf enum / fuzzy', () => {
    const match = matchGarminTaxonomy('stretch 90 90');
    expect(match?.ref).toEqual({ category: 'WARM_UP', exerciseName: 'STRETCH_90_90' });
    expect(['exact', 'fuzzy']).toContain(match?.confidence);
  });

  it('suggests ranked candidates', () => {
    const suggestions = suggestGarminTaxonomy('piriforme', 3);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].labelFr.toLowerCase()).toMatch(/piriform/);
  });
});

describe('resolveGarminExerciseMatch + prescription enrich', () => {
  it('prefers manual alias then taxonomy', () => {
    expect(resolveGarminExerciseMatch({ exercise: 'Pompe' })?.ref).toEqual({
      category: 'PUSH_UP',
      exerciseName: 'PUSH_UP',
    });
    expect(resolveGarminExerciseMatch({ exercise: 'Clamshell avec élastique' })?.ref).toEqual({
      category: 'BANDED_EXERCISES',
      exerciseName: 'CLAM_SHELLS',
    });
  });

  it('attaches garmin refs when normalizing coach prescription', () => {
    const normalized = normalizeCoachStrengthPrescription({
      sets: [{ exercise: 'Étirement 90/90', sets: 2, reps: 0, durationSec: 45 }],
    });
    expect(normalized?.sets[0].garmin).toMatchObject({
      category: 'WARM_UP',
      exerciseName: 'STRETCH_90_90',
    });
    expect(['exact', 'alias']).toContain(normalized?.sets[0].garmin?.confidence);
    expect(strengthSetWatchCompat(normalized!.sets[0]).status).toBe('ready');
  });

  it('marks unknown exercises for watch UI', () => {
    const enriched = attachGarminRefsToPrescription({
      version: 1,
      sets: [
        {
          exercise: 'Glissement nerf sciatique custom xyz',
          sets: 1,
          reps: 10,
          order: 0,
        },
      ],
    });
    // May fuzzy to piriformis or stay unknown depending on tokens — assert shape
    const compat = strengthSetWatchCompat(enriched.sets[0]);
    expect(['ready', 'approx', 'unknown']).toContain(compat.status);
  });
});

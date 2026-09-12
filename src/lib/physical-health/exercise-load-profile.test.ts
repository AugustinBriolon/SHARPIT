import { describe, expect, it } from 'vitest';
import { exerciseLoadProfile } from './exercise-load-profile';

describe('exerciseLoadProfile — declared', () => {
  it('reads the coach declaration first', () => {
    expect(
      exerciseLoadProfile({ exercise: 'Peu importe', intent: 'STRENGTH', pattern: 'SQUAT' }),
    ).toEqual({ groups: ['upper legs'], loads: true, source: 'declared' });
  });

  it('never puts mobility work under load, whatever it targets', () => {
    expect(
      exerciseLoadProfile({ exercise: 'Étirement ischio', intent: 'MOBILITY', pattern: null }),
    ).toEqual({ groups: [], loads: false, source: 'declared' });
  });

  it('treats gainage as loading the waist', () => {
    expect(
      exerciseLoadProfile({
        exercise: 'Planche',
        intent: 'CORE',
        pattern: 'CORE_ANTI_EXTENSION',
      }).groups,
    ).toEqual(['waist']);
  });

  it('keeps a declared load with no pattern as loading nothing nameable', () => {
    const profile = exerciseLoadProfile({ exercise: 'Circuit', intent: 'STRENGTH', pattern: null });

    expect(profile.loads).toBe(true);
    expect(profile.groups).toEqual([]);
  });

  it('says conditioning loads no body group', () => {
    expect(
      exerciseLoadProfile({ exercise: 'Corde à sauter', intent: 'CONDITIONING', pattern: null })
        .loads,
    ).toBe(false);
  });
});

describe('exerciseLoadProfile — curated taxonomy fallback', () => {
  it('classifies a French label the taxonomy knows', () => {
    expect(exerciseLoadProfile({ exercise: 'Fente bulgare' })).toEqual({
      groups: ['upper legs'],
      loads: true,
      source: 'taxonomy',
    });
  });

  it('recognises the stretches that the media catalog mislabels as thigh work', () => {
    // Regression: catalog matching resolved these to "upper legs", so a sciatica
    // declaration warned about the very drills prescribed to treat it.
    for (const exercise of ['Étirement chat et vache', 'Étirement 90/90']) {
      const profile = exerciseLoadProfile({ exercise });

      expect(profile.loads).toBe(false);
      expect(profile.source).toBe('taxonomy');
    }
  });
});

describe('exerciseLoadProfile — watch fallback', () => {
  it('uses the Garmin category when the match was exact or aliased', () => {
    expect(
      exerciseLoadProfile({
        exercise: 'Inconnu au bataillon',
        garmin: { category: 'DEADLIFT', confidence: 'exact' },
      }),
    ).toEqual({ groups: ['upper legs', 'back'], loads: true, source: 'watch' });
  });

  it("reads Garmin's warm-up bucket as mobility", () => {
    expect(
      exerciseLoadProfile({
        exercise: 'Inconnu au bataillon',
        garmin: { category: 'WARM_UP', confidence: 'alias' },
      }),
    ).toEqual({ groups: [], loads: false, source: 'watch' });
  });

  it('refuses a fuzzy watch match — it names a neighbour, not the movement', () => {
    // "Auto-massage voûte plantaire" fuzzy-matched SINGLE_LEG_HIP_RAISE.
    expect(
      exerciseLoadProfile({
        exercise: 'Auto-massage voûte plantaire (balle)',
        garmin: { category: 'HIP_RAISE', confidence: 'fuzzy' },
      }).source,
    ).toBe('unknown');
  });

  it('stays silent on categories that span opposite movements', () => {
    expect(
      exerciseLoadProfile({
        exercise: 'Inconnu',
        garmin: { category: 'BANDED_EXERCISES', confidence: 'exact' },
      }).source,
    ).toBe('unknown');
  });
});

describe('exerciseLoadProfile — unknown', () => {
  it('makes no claim rather than a wrong one', () => {
    expect(exerciseLoadProfile({ exercise: 'Mouvement jamais vu' })).toEqual({
      groups: [],
      loads: false,
      source: 'unknown',
    });
  });

  it('prefers the declaration over the taxonomy when both exist', () => {
    expect(
      exerciseLoadProfile({ exercise: 'Fente bulgare', intent: 'MOBILITY', pattern: null }).source,
    ).toBe('declared');
  });
});

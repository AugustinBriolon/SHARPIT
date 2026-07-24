import { describe, expect, it } from 'vitest';
import { normalizeExerciseKey } from './normalize';
import { exerciseCatalogSize, resolveExerciseMedia } from './resolve';

describe('exercise catalog Phase 1', () => {
  it('loads the slim catalog', () => {
    expect(exerciseCatalogSize()).toBe(1324);
  });

  it('normalizes Garmin-style and French labels', () => {
    expect(normalizeExerciseKey('GOBLET_SQUAT')).toBe('goblet squat');
    expect(normalizeExerciseKey('Développé couché barre')).toBe('developpe couche barre');
  });

  it('resolves aliases to media URLs', () => {
    const bench = resolveExerciseMedia('Développé couché barre');
    expect(bench?.catalogId).toBe('0025');
    expect(bench?.thumbUrl).toContain('/images/0025-');
    expect(bench?.thumbUrl).toContain('.jpg');
    expect(bench?.gifUrl).toContain('/videos/0025-');
    expect(bench?.gifUrl).toContain('.gif');
    expect(bench?.attribution).toContain('Gym visual');

    expect(resolveExerciseMedia('GOBLET_SQUAT')?.catalogId).toBe('0534');
    expect(resolveExerciseMedia('pull-up')?.catalogId).toBe('0652');
  });

  it('resolves French Garmin labels from dogfood sessions', () => {
    const cases: Array<[string, string]> = [
      ['Pompe', '0662'],
      ['Dip avec poids du corps', '0251'],
      ['Squat sans charge', '1685'],
      ['Squat bulgare avec barre à disques', '0099'],
      ['Posture de la planche', '0464'],
      ['Abdominaux', '0274'],
      ['Étirement 90/90', '2567'],
      ['Étirement chat et vache', '1512'],
      ["Étirement posture de l'enfant", '1710'],
      ['Clamshell avec élastique', '3006'],
      ['Clam Shells', '3006'],
      ['Barbell Hip Thrust With Bench', '3562'],
    ];
    for (const [label, id] of cases) {
      expect(resolveExerciseMedia(label)?.catalogId, label).toBe(id);
    }
  });

  it('soft-fails on unknown labels', () => {
    expect(resolveExerciseMedia('xyzzy inventé 999')).toBeNull();
    expect(resolveExerciseMedia('')).toBeNull();
  });
});

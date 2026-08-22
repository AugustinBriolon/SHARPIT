import { describe, expect, it } from 'vitest';
import {
  acceptsTransferredEstimate,
  bearsLoadAxis,
  informsPatternStrength,
  movementById,
  movementsInPattern,
  movementTaxonomyIndex,
  resolveMovement,
} from '@/lib/exercises/movement-taxonomy';

describe('movement taxonomy data', () => {
  it('parses and indexes every curated entry', () => {
    const index = movementTaxonomyIndex();
    expect(index.entries.length).toBeGreaterThan(50);
    expect(index.byId.size).toBe(index.entries.length);
  });

  it('never lets two movements claim the same label', () => {
    // "Écarté" (chest flye) and "Écartés-sautés" (jumping jacks) are one typo apart
    // and belong to opposite intents — indexing throws if they ever collide.
    expect(() => movementTaxonomyIndex()).not.toThrow();
    expect(resolveMovement({ exercise: 'Écarté' })?.pattern).toBe('HORIZONTAL_PUSH');
    expect(resolveMovement({ exercise: 'Écartés-sautés' })?.intent).toBe('CONDITIONING');
  });

  it('keeps mobility off the load axis entirely', () => {
    for (const entry of movementTaxonomyIndex().entries) {
      if (entry.intent !== 'MOBILITY') continue;
      expect(entry.modality).toBe('NONE');
      expect(entry.pattern).toBeNull();
      expect(bearsLoadAxis(entry)).toBe(false);
    }
  });

  it('gives every bodyweight movement a leverage factor', () => {
    for (const entry of movementTaxonomyIndex().entries) {
      const bodyweight =
        entry.modality === 'BODYWEIGHT_LOADABLE' ||
        entry.modality === 'BODYWEIGHT_FIXED' ||
        entry.modality === 'ASSISTED';
      expect(entry.leverageFactor === null).toBe(!bodyweight);
    }
  });

  it('lets only strength movements feed a pattern strength scalar', () => {
    for (const entry of movementTaxonomyIndex().entries) {
      if (informsPatternStrength(entry)) expect(entry.intent).toBe('STRENGTH');
    }
  });
});

describe('resolveMovement', () => {
  it('matches a curated label regardless of case and accents', () => {
    expect(resolveMovement({ exercise: 'traction' })?.id).toBe('traction');
    expect(resolveMovement({ exercise: 'TRACTIONS' })?.id).toBe('traction');
    expect(resolveMovement({ exercise: 'Étirement 90/90' })?.id).toBe('etirement-90-90');
  });

  it('bridges through the media catalog when the raw label is unknown', () => {
    const viaCatalogId = resolveMovement({
      exercise: 'libellé inconnu',
      exerciseCatalogId: '0662',
    });
    expect(viaCatalogId?.id).toBe('pompe');
  });

  it('returns null rather than guessing on an unknown movement', () => {
    expect(resolveMovement({ exercise: 'Inconnu' })).toBeNull();
    expect(resolveMovement({ exercise: 'Banded Exercises' })).toBeNull();
  });
});

describe('capability gating', () => {
  it('shares a pattern with plyometrics without letting them inform strength', () => {
    const jumpSquat = movementById('squat-saute');
    const backSquat = movementById('squat-barre-dos');
    expect(jumpSquat?.pattern).toBe(backSquat?.pattern);
    expect(informsPatternStrength(jumpSquat!)).toBe(false);
    expect(informsPatternStrength(backSquat!)).toBe(true);
  });

  it('refuses transferred estimates on technique-limited lifts', () => {
    const snatch = movementById('arrache');
    expect(snatch?.skillLimited).toBe(true);
    expect(acceptsTransferredEstimate(snatch!)).toBe(false);
    expect(acceptsTransferredEstimate(movementById('fente-bulgare')!)).toBe(true);
  });

  it('orders a pattern neighbourhood by how much each movement informs it', () => {
    const squats = movementsInPattern('SQUAT');
    expect(squats[0]?.id).toBe('squat-barre-dos');
    expect(squats.at(-1)?.centrality).toBe(0);
  });

  it('excludes core work from the load model while keeping its pattern', () => {
    const plank = movementById('planche');
    expect(plank?.pattern).toBe('CORE_ANTI_EXTENSION');
    expect(bearsLoadAxis(plank!)).toBe(false);
  });
});

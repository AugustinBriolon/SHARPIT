import { describe, expect, it } from 'vitest';
import { dedupeHeadlineAgainstTitle, presentNarrativeBody } from './narrative-presentation';

describe('dedupeHeadlineAgainstTitle', () => {
  it('keeps the clause after a colon when the lead-in echoes the title', () => {
    expect(
      dedupeHeadlineAgainstTitle(
        'Sortie longue maîtrisée : endurance solide malgré un contexte de récupération moyen.',
        'Colombes - Sortie Longue Course à Pied',
      ),
    ).toBe('Endurance solide malgré un contexte de récupération moyen.');
  });

  it('keeps the headline when overlap is short or absent', () => {
    expect(
      dedupeHeadlineAgainstTitle('Endurance solide sur le parcours.', 'Colombes - Sortie Longue'),
    ).toBe('Endurance solide sur le parcours.');
  });
});

describe('presentNarrativeBody', () => {
  it('replaces expert acronyms in essential mode', () => {
    expect(presentNarrativeBody('ACWR à 1.06 et TSB +5 avec LTHR à 170.', 'essential')).toBe(
      'charge relative à 1.06 et indice de forme +5 avec seuil cardio à 170.',
    );
  });

  it('leaves expert mode unchanged', () => {
    const source = 'ACWR à 1.06 et TSB +5.';
    expect(presentNarrativeBody(source, 'expert')).toBe(source);
  });
});

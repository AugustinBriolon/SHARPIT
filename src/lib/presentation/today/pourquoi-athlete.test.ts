import { describe, expect, it } from 'vitest';
import { buildPourquoiAthleteCopy } from './pourquoi-athlete';

describe('buildPourquoiAthleteCopy', () => {
  it('returns readable FR sentences for FULL without machine dump', () => {
    const copy = buildPourquoiAthleteCopy({
      softHero: false,
      packTier: 'FULL',
      visibleGaps: [],
      goalVsJournalWeight: 'Objectif prioritaire · Journal wellness pondéré en Recovery v1',
      journalWeighted: true,
    });

    expect(copy.summary).toBeNull();
    expect(copy.gapBullets).toEqual([]);
    expect(copy.sentences).toHaveLength(3);
    expect(copy.sentences.join(' ')).not.toMatch(/\bFULL\b/);
    expect(copy.sentences.join(' ')).not.toMatch(/Âge\s*:/);
    expect(copy.sentences.join(' ')).not.toMatch(/[—–]/);
    expect(copy.sentences[0]).toMatch(/sommeil/i);
  });

  it('keeps 1–2 soft-hero gap bullets and hedges for PARTIAL', () => {
    const copy = buildPourquoiAthleteCopy({
      softHero: true,
      packTier: 'PARTIAL',
      visibleGaps: [
        'Sommeil de la nuit manquant',
        'HRV du matin manquante',
        'Baseline HRV trop courte (moins de 7 j)',
      ],
      goalVsJournalWeight: 'Objectif prioritaire · journal wellness non encore saisi',
      journalWeighted: false,
    });

    expect(copy.summary).toBe('Estimation partielle');
    expect(copy.gapBullets).toHaveLength(2);
    expect(copy.sentences.join(' ')).not.toMatch(/\bPARTIAL\b/);
    expect(copy.sentences.join(' ')).not.toMatch(/[—–]/);
  });

  it('uses insufficient summary without exposing INSUFFICIENT label in prose', () => {
    const copy = buildPourquoiAthleteCopy({
      softHero: true,
      packTier: 'INSUFFICIENT',
      visibleGaps: ['Sommeil de la nuit manquant'],
      goalVsJournalWeight: 'Objectif prioritaire · journal wellness non encore saisi',
      journalWeighted: false,
    });

    expect(copy.summary).toBe('Données insuffisantes');
    expect(copy.sentences.join(' ')).not.toMatch(/\bINSUFFICIENT\b/);
  });
});

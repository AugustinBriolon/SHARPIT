import { describe, expect, it } from 'vitest';
import {
  buildCoachMemorySummary,
  formatEntryDateRange,
  parseDurablePreferences,
  shouldRenderAsBullets,
} from './memory-summary';
import type { CoachMemoryEntry } from './types';

function entry(overrides: Partial<CoachMemoryEntry> = {}): CoachMemoryEntry {
  return {
    id: 'e1',
    type: 'TRAVEL',
    source: 'USER',
    label: null,
    locationLabel: 'Chamonix',
    locationLat: null,
    locationLng: null,
    startDate: '2026-08-06',
    endDate: '2026-08-12',
    note: null,
    trainingConstraint: 'FULL',
    allowedDisciplines: [],
    isActive: false,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('parseDurablePreferences', () => {
  it('strips bullet markers and drops blank lines', () => {
    expect(
      parseDurablePreferences('- Télétravail lundi\n\n* Pas plus de 45 min\n  \n• Nage tôt'),
    ).toEqual(['Télétravail lundi', 'Pas plus de 45 min', 'Nage tôt']);
  });

  it('returns nothing for empty or whitespace-only context', () => {
    expect(parseDurablePreferences('')).toEqual([]);
    expect(parseDurablePreferences('   \n  ')).toEqual([]);
  });

  it('segments a single paragraph into its own sentences, verbatim', () => {
    expect(
      parseDurablePreferences(
        'Je suis en télétravail le lundi. Je préfère nager tôt le matin. Garder de la marge !',
      ),
    ).toEqual([
      'Je suis en télétravail le lundi.',
      'Je préfère nager tôt le matin.',
      'Garder de la marge !',
    ]);
  });

  it('does not split on an abbreviation followed by a sentence start', () => {
    expect(parseDurablePreferences('Pas plus de 45 min. Je nage tôt.')).toEqual([
      'Pas plus de 45 min. Je nage tôt.',
    ]);
    expect(parseDurablePreferences('Séance courte (ex. Mardi midi). Nage tôt.')).toEqual([
      'Séance courte (ex. Mardi midi).',
      'Nage tôt.',
    ]);
  });

  it('does not split inside decimals or mid-sentence dots', () => {
    expect(parseDurablePreferences('Je cours 10.5 km le mardi. Repos le mercredi.')).toEqual([
      'Je cours 10.5 km le mardi.',
      'Repos le mercredi.',
    ]);
  });

  it('keeps an unterminated paragraph as one item', () => {
    expect(parseDurablePreferences('Je préfère nager tôt le matin')).toEqual([
      'Je préfère nager tôt le matin',
    ]);
  });

  it('prefers explicit lines over sentence segmentation', () => {
    expect(parseDurablePreferences('Un. Deux.\nTrois. Quatre.')).toEqual([
      'Un. Deux.',
      'Trois. Quatre.',
    ]);
  });
});

describe('shouldRenderAsBullets', () => {
  it('keeps a lone sentence as a paragraph', () => {
    expect(shouldRenderAsBullets('Je préfère nager tôt le matin.')).toBe(false);
  });

  it('uses bullets from two items up', () => {
    expect(shouldRenderAsBullets('- Un\n- Deux')).toBe(true);
    expect(shouldRenderAsBullets('Je nage tôt. Je cours le soir.')).toBe(true);
  });
});

describe('buildCoachMemorySummary', () => {
  it('returns null when there is nothing remembered', () => {
    expect(buildCoachMemorySummary({ profileContext: '', entries: [] })).toBeNull();
    expect(
      buildCoachMemorySummary({ profileContext: '  ', entries: [entry({ isActive: false })] }),
    ).toBeNull();
  });

  it('reports the durable preference count without paraphrasing the text', () => {
    const summary = buildCoachMemorySummary({
      profileContext: '- Un\n- Deux\n- Trois',
      entries: [],
    });

    expect(summary).toBe('Je garde en tête tes 3 préférences durables.');
    expect(summary).not.toContain('Un');
  });

  it('singularises a lone preference', () => {
    expect(buildCoachMemorySummary({ profileContext: 'Nage tôt', entries: [] })).toBe(
      'Je garde en tête ta préférence durable.',
    );
  });

  it('names the single active constraint with its end date', () => {
    const summary = buildCoachMemorySummary({
      profileContext: '',
      entries: [entry({ isActive: true })],
    });

    expect(summary).toBe("En ce moment, je tiens compte de Chamonix jusqu'au 12 août.");
  });

  it('appends the training constraint when it is not FULL', () => {
    const summary = buildCoachMemorySummary({
      profileContext: '',
      entries: [entry({ isActive: true, trainingConstraint: 'REDUCED' })],
    });

    expect(summary).toBe(
      "En ce moment, je tiens compte de Chamonix jusqu'au 12 août — entraînement réduit.",
    );
  });

  it('counts several active constraints and names the first', () => {
    const summary = buildCoachMemorySummary({
      profileContext: '',
      entries: [
        entry({ id: 'a', isActive: true }),
        entry({ id: 'b', isActive: true, locationLabel: 'Annecy' }),
      ],
    });

    expect(summary).toBe(
      "En ce moment, je tiens compte de 2 contraintes, dont Chamonix jusqu'au 12 août.",
    );
  });

  it('ignores inactive entries', () => {
    expect(
      buildCoachMemorySummary({
        profileContext: 'Nage tôt',
        entries: [entry({ isActive: false })],
      }),
    ).toBe('Je garde en tête ta préférence durable.');
  });

  it('combines both layers when both exist', () => {
    const summary = buildCoachMemorySummary({
      profileContext: '- Un\n- Deux',
      entries: [entry({ isActive: true })],
    });

    expect(summary).toBe(
      "Je garde en tête tes 2 préférences durables. En ce moment, je tiens compte de Chamonix jusqu'au 12 août.",
    );
  });

  it('falls back to the label, then the type, when no location is set', () => {
    expect(
      buildCoachMemorySummary({
        profileContext: '',
        entries: [entry({ isActive: true, label: 'Séminaire', locationLabel: null })],
      }),
    ).toContain('Séminaire');

    expect(
      buildCoachMemorySummary({
        profileContext: '',
        entries: [entry({ isActive: true, type: 'CONSTRAINT', label: null, locationLabel: null })],
      }),
    ).toContain('Contrainte');
  });
});

describe('formatEntryDateRange', () => {
  it('collapses the month when both ends share it', () => {
    expect(formatEntryDateRange(entry())).toBe('6 – 12 août 2026');
  });

  it('keeps both months when the window spans two', () => {
    expect(formatEntryDateRange(entry({ startDate: '2026-08-30', endDate: '2026-09-04' }))).toBe(
      '30 août – 4 sept. 2026',
    );
  });

  it('reads a running window by its end only', () => {
    expect(formatEntryDateRange(entry({ isActive: true }))).toBe("jusqu'au 12 août 2026");
  });
});

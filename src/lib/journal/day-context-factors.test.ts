import { describe, expect, it } from 'vitest';
import {
  DAY_CONTEXT_FACTORS,
  formatDayContextFactorsNote,
  isPriorNightFactor,
  mergeWellnessNotesWithFactors,
  toggleDayContextFactor,
  type DayContextFactorId,
} from './day-context-factors';
import { JOURNAL_PRIOR_NIGHT_FACTOR_IDS } from './day-journal';
import {
  JOURNAL_LOADED_CONTENT_ORDER,
  splitJournalFactorIdsForScreen,
} from './journal-screen-sections';

const EXPECTED_PRIOR_NIGHT_IDS = [
  'late_meal',
  'device_in_bed',
  'shared_bed',
  'earplugs',
  'sleep_mask',
  'pet_in_room',
  'melatonin',
] as const satisfies readonly DayContextFactorId[];

describe('day-context-factors', () => {
  it('toggles factors without duplicates', () => {
    expect(toggleDayContextFactor([], 'coffee')).toEqual(['coffee']);
    expect(toggleDayContextFactor(['coffee'], 'coffee')).toEqual([]);
    expect(toggleDayContextFactor(['coffee'], 'mood_low')).toEqual(['coffee', 'mood_low']);
  });

  it('formats a coach-readable context line', () => {
    expect(formatDayContextFactorsNote(['coffee', 'hydration_low'])).toBe(
      'Contexte : Café · Hydratation',
    );
    expect(formatDayContextFactorsNote(['late_meal', 'device_in_bed'])).toBe(
      'Contexte : Repas tardif (nuit J-1→J) · Écran au lit (nuit J-1→J)',
    );
    expect(formatDayContextFactorsNote(['shared_bed', 'melatonin'])).toBe(
      'Contexte : Lit partagé (nuit J-1→J) · Mélatonine (nuit J-1→J)',
    );
    expect(formatDayContextFactorsNote(['alcohol', 'creatine'])).toBe(
      'Contexte : Alcool · Créatine',
    );
    expect(formatDayContextFactorsNote([])).toBeNull();
  });

  it('merges free notes with context factors', () => {
    expect(mergeWellnessNotesWithFactors('Sommeil court', ['late_meal'])).toBe(
      'Sommeil court\nContexte : Repas tardif (nuit J-1→J)',
    );
    expect(mergeWellnessNotesWithFactors(null, ['mood_low'])).toBe('Contexte : Humeur basse');
    expect(mergeWellnessNotesWithFactors('  ok  ', [])).toBe('ok');
  });

  it('promotes sleep-hygiene factors to prior_night and leaves day-adjacent out', () => {
    for (const id of EXPECTED_PRIOR_NIGHT_IDS) {
      expect(isPriorNightFactor(id)).toBe(true);
      expect(DAY_CONTEXT_FACTORS.find((f) => f.id === id)?.window).toBe('prior_night');
    }
    expect(isPriorNightFactor('night_work')).toBe(false);
    expect(isPriorNightFactor('hydration_quality')).toBe(false);
    expect(isPriorNightFactor('alcohol')).toBe(false);
  });
});

describe('journal prior-night screen split', () => {
  it('exposes JOURNAL_PRIOR_NIGHT_FACTOR_IDS from catalog window', () => {
    expect([...JOURNAL_PRIOR_NIGHT_FACTOR_IDS].sort()).toEqual(
      [...EXPECTED_PRIOR_NIGHT_IDS].sort(),
    );
  });

  it('splits enabled ids via isPriorNightFactor (not a hardcoded two-id list)', () => {
    const { priorNightIds, dayFactorIds } = splitJournalFactorIdsForScreen([
      'late_meal',
      'alcohol',
      'shared_bed',
      'night_work',
      'melatonin',
      'hydration_quality',
      'custom_abc123def456',
      'earplugs',
    ]);
    expect(priorNightIds).toEqual(['late_meal', 'shared_bed', 'melatonin', 'earplugs']);
    expect(dayFactorIds).toEqual([
      'alcohol',
      'night_work',
      'hydration_quality',
      'custom_abc123def456',
    ]);
  });

  it('documents JournalLoadedContent section order: derived then Nuit dernière then Signaux', () => {
    expect(JOURNAL_LOADED_CONTENT_ORDER).toEqual([
      'day_metrics',
      'derived_panels',
      'prior_night',
      'day_signals',
    ]);
    const priorNightIndex = JOURNAL_LOADED_CONTENT_ORDER.indexOf('prior_night');
    const signalsIndex = JOURNAL_LOADED_CONTENT_ORDER.indexOf('day_signals');
    const derivedIndex = JOURNAL_LOADED_CONTENT_ORDER.indexOf('derived_panels');
    expect(derivedIndex).toBeLessThan(priorNightIndex);
    expect(priorNightIndex).toBe(signalsIndex - 1);
  });
});

import { describe, expect, it } from 'vitest';
import {
  parseMorningWellnessEntry,
  seedMorningWellnessForm,
} from '@sharpit/server/lib/journal/morning-wellness-entry';
import {
  mapSorenessDomainToUi,
  mapSorenessUiToDomain,
  WELLNESS_UI_SCALE,
} from '@sharpit/server/lib/journal/morning-wellness-scale';

describe('morning wellness UI scale', () => {
  it('exposes a continuous 1–5 range', () => {
    expect([...WELLNESS_UI_SCALE]).toEqual([1, 2, 3, 4, 5]);
  });

  it('maps soreness UI scores linearly onto the domain 0–10 scale', () => {
    expect(mapSorenessUiToDomain(1)).toBe(0);
    expect(mapSorenessUiToDomain(2)).toBe(3);
    expect(mapSorenessUiToDomain(3)).toBe(5);
    expect(mapSorenessUiToDomain(4)).toBe(8);
    expect(mapSorenessUiToDomain(5)).toBe(10);
  });

  it('round-trips soreness UI ↔ domain for hydrate on edit', () => {
    for (const ui of WELLNESS_UI_SCALE) {
      expect(mapSorenessDomainToUi(mapSorenessUiToDomain(ui))).toBe(ui);
    }
  });
});

describe('morning wellness entry hydrate', () => {
  const complete = {
    mood: 3,
    energyLevel: 4,
    perceivedSoreness: 5,
    stressLevel: 2,
    notes: 'nuit courte',
  };

  it('parses a complete morning SUBJECTIVE payload', () => {
    expect(parseMorningWellnessEntry(complete)).toEqual(complete);
  });

  it('rejects session-linked or incomplete payloads', () => {
    expect(parseMorningWellnessEntry({ ...complete, sessionExternalId: 'act-1' })).toBeNull();
    expect(parseMorningWellnessEntry({ mood: 3, energyLevel: 4 })).toBeNull();
    expect(parseMorningWellnessEntry(null)).toBeNull();
  });

  it('seeds ScalePicker values from a saved entry', () => {
    expect(seedMorningWellnessForm(complete)).toEqual({
      mood: 3,
      energyLevel: 4,
      perceivedSoreness: 3,
      stressLevel: 2,
      notes: 'nuit courte',
    });
  });

  it('keeps first-time fill unset when there is no entry', () => {
    expect(seedMorningWellnessForm(null)).toBeNull();
    expect(seedMorningWellnessForm(undefined)).toBeNull();
  });
});

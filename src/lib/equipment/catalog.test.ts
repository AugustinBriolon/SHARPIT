import { describe, expect, it } from 'vitest';
import {
  catalogItemsForSport,
  EQUIPMENT_CATALOG,
  EQUIPMENT_ITEM_IDS,
} from '@/lib/equipment/catalog';
import { formatEquipmentForCoach, equipmentSportHint } from '@/lib/equipment/format';
import {
  hasConfiguredEquipment,
  normalizeAthleteEquipment,
  sanitizeOwnedForVenue,
  setStrengthVenue,
  toggleOwnedItem,
} from '@/lib/equipment/parse';
import { EMPTY_ATHLETE_EQUIPMENT } from '@/lib/equipment/types';

describe('equipment catalog', () => {
  it('only lists impactful items (no comfort accessories)', () => {
    const labels = EQUIPMENT_CATALOG.map((item) => item.label.toLowerCase());
    expect(labels.some((label) => label.includes('gant'))).toBe(false);
    expect(labels.some((label) => label.includes('casque'))).toBe(false);
    expect(EQUIPMENT_ITEM_IDS).toContain('bike_home_trainer');
    expect(EQUIPMENT_ITEM_IDS).toContain('swim_fins');
  });

  it('hides home strength items until venue allows them', () => {
    expect(catalogItemsForSport('STRENGTH', null)).toHaveLength(0);
    expect(catalogItemsForSport('STRENGTH', 'gym')).toHaveLength(0);
    expect(catalogItemsForSport('STRENGTH', 'bodyweight')).toHaveLength(0);
    expect(catalogItemsForSport('STRENGTH', 'home').length).toBeGreaterThan(0);
    expect(catalogItemsForSport('STRENGTH', 'both').length).toBeGreaterThan(0);
  });
});

describe('normalizeAthleteEquipment', () => {
  it('returns empty inventory for nullish input', () => {
    expect(normalizeAthleteEquipment(null)).toEqual(EMPTY_ATHLETE_EQUIPMENT);
    expect(normalizeAthleteEquipment(undefined)).toEqual(EMPTY_ATHLETE_EQUIPMENT);
  });

  it('filters unknown ids and drops home items when venue is gym', () => {
    const normalized = normalizeAthleteEquipment({
      version: 1,
      strengthVenue: 'gym',
      owned: ['bike_home_trainer', 'strength_dumbbells', 'not_real'],
    });
    expect(normalized.owned).toEqual(['bike_home_trainer']);
    expect(normalized.strengthVenue).toBe('gym');
  });
});

describe('equipment mutations', () => {
  it('toggles owned items and sanitizes on venue change', () => {
    let equipment = toggleOwnedItem(EMPTY_ATHLETE_EQUIPMENT, 'bike_home_trainer', true);
    equipment = setStrengthVenue(equipment, 'home');
    equipment = toggleOwnedItem(equipment, 'strength_dumbbells', true);
    expect(equipment.owned).toEqual(['bike_home_trainer', 'strength_dumbbells']);

    equipment = setStrengthVenue(equipment, 'gym');
    expect(equipment.owned).toEqual(['bike_home_trainer']);
    expect(sanitizeOwnedForVenue(['strength_barbell'], 'bodyweight')).toEqual([]);
  });
});

describe('formatEquipmentForCoach', () => {
  it('states minimal universal fallback when empty', () => {
    const text = formatEquipmentForCoach(EMPTY_ATHLETE_EQUIPMENT);
    expect(text).toContain('## Équipement disponible');
    expect(text).toContain('Non renseigné');
    expect(text).toContain('minimal universel');
  });

  it('lists gym as salle capability without inventory', () => {
    const text = formatEquipmentForCoach({
      version: 1,
      strengthVenue: 'gym',
      owned: ['bike_home_trainer', 'swim_pool'],
    });
    expect(text).toContain('IMPÉRATIF');
    expect(text).toContain('Musculation');
    expect(text).toContain('Salle');
    expect(text).toContain('Home trainer');
    expect(text).toContain('Accès piscine');
  });
});

describe('equipmentSportHint', () => {
  it('explains gym shortcut', () => {
    expect(equipmentSportHint({ version: 1, strengthVenue: 'gym', owned: [] }, 'STRENGTH')).toMatch(
      /salle/i,
    );
  });

  it('detects configured inventory', () => {
    expect(hasConfiguredEquipment(EMPTY_ATHLETE_EQUIPMENT)).toBe(false);
    expect(hasConfiguredEquipment({ version: 1, strengthVenue: 'bodyweight', owned: [] })).toBe(
      true,
    );
  });
});

import { ActivityType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CORE_PRACTICED_SPORTS,
  equipmentSportsForPracticed,
  hasCorePracticedSport,
  normalizeAthletePracticedSports,
  performanceSportsForPracticed,
  periodSportOptionsForPracticed,
  togglePracticedSport,
  type PracticedSportId,
} from './index';

describe('togglePracticedSport — triathlon coupling', () => {
  it('checking triathlon adds run, bike and swim', () => {
    const next = togglePracticedSport([], 'triathlon', true);
    expect(next.sort()).toEqual(['bike', 'run', 'swim', 'triathlon'].sort());
  });

  it('unchecking run removes triathlon while keeping bike and swim', () => {
    const start: PracticedSportId[] = ['run', 'bike', 'swim', 'triathlon'];
    const next = togglePracticedSport(start, 'run', false);
    expect(next.includes('triathlon')).toBe(false);
    expect(next.includes('run')).toBe(false);
    expect(next.includes('bike')).toBe(true);
    expect(next.includes('swim')).toBe(true);
  });

  it('unchecking bike removes triathlon', () => {
    const start: PracticedSportId[] = ['run', 'bike', 'swim', 'triathlon'];
    expect(togglePracticedSport(start, 'bike', false).includes('triathlon')).toBe(false);
  });

  it('unchecking swim removes triathlon', () => {
    const start: PracticedSportId[] = ['run', 'bike', 'swim', 'triathlon'];
    expect(togglePracticedSport(start, 'swim', false).includes('triathlon')).toBe(false);
  });

  it('checking all three individually auto-checks triathlon', () => {
    let sports: PracticedSportId[] = [];
    sports = togglePracticedSport(sports, 'run', true);
    sports = togglePracticedSport(sports, 'bike', true);
    sports = togglePracticedSport(sports, 'swim', true);
    expect(sports.includes('triathlon')).toBe(true);
  });

  it('toggling complementary sports does not affect triathlon', () => {
    const start: PracticedSportId[] = ['run'];
    const withStrength = togglePracticedSport(start, 'strength', true);
    expect(withStrength.sort()).toEqual(['run', 'strength'].sort());
    const withMobility = togglePracticedSport(withStrength, 'mobility', true);
    expect(withMobility.includes('triathlon')).toBe(false);
  });
});

describe('hasCorePracticedSport — validation', () => {
  it('rejects empty and complementary-only selections', () => {
    expect(hasCorePracticedSport([])).toBe(false);
    expect(hasCorePracticedSport(['strength', 'mobility', 'stretching'])).toBe(false);
  });

  it('accepts any single core endurance sport including triathlon', () => {
    expect(hasCorePracticedSport(['run'])).toBe(true);
    expect(hasCorePracticedSport(['bike'])).toBe(true);
    expect(hasCorePracticedSport(['swim'])).toBe(true);
    expect(hasCorePracticedSport(['triathlon'])).toBe(true);
  });
});

describe('normalizeAthletePracticedSports — existing users', () => {
  it('defaults null/invalid to all core sports so existing athletes are not blocked', () => {
    expect(normalizeAthletePracticedSports(null).sports).toEqual([
      ...DEFAULT_CORE_PRACTICED_SPORTS,
    ]);
    expect(normalizeAthletePracticedSports(undefined).sports).toEqual([
      ...DEFAULT_CORE_PRACTICED_SPORTS,
    ]);
    expect(normalizeAthletePracticedSports({ version: 1, sports: [] }).sports).toEqual([
      ...DEFAULT_CORE_PRACTICED_SPORTS,
    ]);
  });

  it('keeps a valid stored selection and drops unknown ids', () => {
    const normalized = normalizeAthletePracticedSports({
      version: 1,
      sports: ['run', 'strength', 'hike', 'autre'],
    });
    expect(normalized.sports).toEqual(['run', 'strength']);
  });
});

describe('equipmentSportsForPracticed', () => {
  it('maps triathlon to run+bike+swim equipment tabs', () => {
    expect(equipmentSportsForPracticed(['triathlon'])).toEqual(['RUN', 'BIKE', 'SWIM']);
  });

  it('shows strength venue tab only when strength is practiced', () => {
    expect(equipmentSportsForPracticed(['run'])).toEqual(['RUN']);
    expect(equipmentSportsForPracticed(['run', 'strength'])).toEqual(['RUN', 'STRENGTH']);
  });

  it('maps mobility or stretching to the MOBILITY tab', () => {
    expect(equipmentSportsForPracticed(['run', 'mobility'])).toEqual(['RUN', 'MOBILITY']);
    expect(equipmentSportsForPracticed(['run', 'stretching'])).toEqual(['RUN', 'MOBILITY']);
    expect(equipmentSportsForPracticed(['run', 'mobility', 'stretching'])).toEqual([
      'RUN',
      'MOBILITY',
    ]);
  });
});

describe('intention / goals filtering', () => {
  it('offers only run for a run-only athlete in performance goals', () => {
    expect(performanceSportsForPracticed(['run'])).toEqual([ActivityType.RUN]);
  });

  it('offers run+bike+swim when triathlon is practiced', () => {
    expect(performanceSportsForPracticed(['triathlon'])).toEqual([
      ActivityType.RUN,
      ActivityType.BIKE,
      ActivityType.SWIM,
    ]);
  });

  it('filters period sport options to practiced sports and keeps ALL', () => {
    expect(periodSportOptionsForPracticed(['run', 'strength'])).toEqual([
      'ALL',
      ActivityType.RUN,
      ActivityType.STRENGTH,
    ]);
  });

  it('does not offer bike/swim when only run is practiced', () => {
    const options = periodSportOptionsForPracticed(['run']);
    expect(options).toEqual(['ALL', ActivityType.RUN]);
    expect(options).not.toContain(ActivityType.BIKE);
    expect(options).not.toContain(ActivityType.SWIM);
  });
});

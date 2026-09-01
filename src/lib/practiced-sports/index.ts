export {
  COMPLEMENTARY_PRACTICED_SPORTS,
  CORE_PRACTICED_SPORTS,
  DEFAULT_CORE_PRACTICED_SPORTS,
  EMPTY_ATHLETE_PRACTICED_SPORTS,
  PRACTICED_SPORTS,
  PRACTICED_SPORT_LABELS,
  hasCorePracticedSport,
  isCorePracticedSportId,
  isPracticedSportId,
  normalizeAthletePracticedSports,
  sanitizePracticedSportsForPersist,
  togglePracticedSport,
} from './catalog';
export type {
  AthletePracticedSports,
  ComplementaryPracticedSportId,
  CorePracticedSportId,
  PracticedSportId,
} from './catalog';

export {
  enduranceActivityTypesForPracticed,
  equipmentSportsForPracticed,
  performanceSportsForPracticed,
  periodSportOptionsForPracticed,
} from './filter';
export type { PeriodSportOption } from './filter';

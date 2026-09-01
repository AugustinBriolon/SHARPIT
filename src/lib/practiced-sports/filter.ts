import { ActivityType } from '@prisma/client';
import type { EquipmentSport } from '@/lib/equipment/catalog';
import { EQUIPMENT_SPORTS } from '@/lib/equipment/catalog';
import type { PracticedSportId } from '@/lib/practiced-sports/catalog';

const ENDURANCE_EQUIPMENT: {
  practiced: PracticedSportId;
  equipment: EquipmentSport;
}[] = [
  { practiced: 'run', equipment: 'RUN' },
  { practiced: 'bike', equipment: 'BIKE' },
  { practiced: 'swim', equipment: 'SWIM' },
];

const ENDURANCE_ACTIVITY: {
  practiced: PracticedSportId;
  activity: ActivityType;
}[] = [
  { practiced: 'run', activity: ActivityType.RUN },
  { practiced: 'bike', activity: ActivityType.BIKE },
  { practiced: 'swim', activity: ActivityType.SWIM },
];

/** Effective endurance activity types implied by practiced sports (triathlon expands). */
export function enduranceActivityTypesForPracticed(
  sports: readonly PracticedSportId[],
): ActivityType[] {
  const hasTri = sports.includes('triathlon');
  return ENDURANCE_ACTIVITY.filter(({ practiced }) => hasTri || sports.includes(practiced)).map(
    ({ activity }) => activity,
  );
}

export function performanceSportsForPracticed(sports: readonly PracticedSportId[]): ActivityType[] {
  return enduranceActivityTypesForPracticed(sports);
}

export type PeriodSportOption = ActivityType | 'ALL';

/**
 * Period goal sport picker options filtered by practiced sports.
 * Always keeps « Tous sports ». Drops OTHER (endurance-first). STRENGTH only if practiced.
 */
export function periodSportOptionsForPracticed(
  sports: readonly PracticedSportId[],
): PeriodSportOption[] {
  const options: PeriodSportOption[] = ['ALL', ...enduranceActivityTypesForPracticed(sports)];
  if (sports.includes('strength')) {
    options.push(ActivityType.STRENGTH);
  }
  return options;
}

/** Equipment UI tabs visible for the athlete's practiced sports. */
export function equipmentSportsForPracticed(sports: readonly PracticedSportId[]): EquipmentSport[] {
  const hasTri = sports.includes('triathlon');
  const set = new Set<EquipmentSport>(
    ENDURANCE_EQUIPMENT.filter(({ practiced }) => hasTri || sports.includes(practiced)).map(
      ({ equipment }) => equipment,
    ),
  );
  if (sports.includes('strength')) {
    set.add('STRENGTH');
  }
  if (sports.includes('mobility') || sports.includes('stretching')) {
    set.add('MOBILITY');
  }
  return EQUIPMENT_SPORTS.filter((sport) => set.has(sport));
}

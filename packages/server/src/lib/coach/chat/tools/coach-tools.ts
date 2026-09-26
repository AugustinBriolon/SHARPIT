import {
  DEFAULT_CORE_PRACTICED_SPORTS,
  type PracticedSportId,
} from '@sharpit/server/lib/practiced-sports';
import { buildContextCoachTools } from './coach-tools-context';
import { buildQueryCoachTools } from './coach-tools-query';
import { buildSessionCoachTools } from './coach-tools-sessions';
import { coachTypeEnumForSports, travelDisciplineEnumForSports } from './coach-tools-shared';

/**
 * Tous s'exécutent côté serveur et renvoient un résumé compact.
 * `practicedSports` narrows create/update/travel proposal enums (proposals only).
 */
export function createCoachTools(
  athleteId: string,
  options?: { practicedSports?: readonly PracticedSportId[] },
) {
  const practicedSports = options?.practicedSports ?? [...DEFAULT_CORE_PRACTICED_SPORTS];
  const proposalTypeEnum = coachTypeEnumForSports(practicedSports);
  const proposalTravelEnum = travelDisciplineEnumForSports(practicedSports);

  return {
    ...buildQueryCoachTools(athleteId),
    ...buildSessionCoachTools(athleteId, practicedSports, proposalTypeEnum),
    ...buildContextCoachTools(athleteId, proposalTravelEnum),
  };
}

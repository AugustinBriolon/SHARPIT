import { after } from 'next/server';
import { z } from 'zod';
import { getActiveTrainingPlan, getGoalById, getGoals } from '@sharpit/server/lib/queries';
import {
  resolveDefaultPlanGoalId,
  selectableDatedGoalIds,
} from '@sharpit/app/lib/planned-session/plan-goal';
import {
  coachStrengthPrescriptionSchema,
  resolveStrengthFieldsForPersist,
} from '@sharpit/app/lib/planned-session/strength/strength-prescription';
import {
  coachEndurancePrescriptionSchema,
  resolveEnduranceFieldsForPersist,
} from '@sharpit/app/lib/planned-session/endurance/coach-endurance-prescription';
import { refreshAndPersistPlannedSessionContext } from '@sharpit/server/lib/planned-session/resolve-context';
import {
  coachActivityTypesForPracticed,
  isCoachActivityTypeAllowed,
  travelDisciplinesForPracticed,
  type CoachActivityType,
  type PracticedSportId,
} from '@sharpit/app/lib/practiced-sports';
import type { TravelDiscipline } from '@sharpit/app/lib/travel-context/disciplines';

export function scheduleSessionContextRefresh(athleteId: string, sessionId: string) {
  after(async () => {
    try {
      await refreshAndPersistPlannedSessionContext(athleteId, sessionId);
    } catch (error) {
      console.error('[coach] session context refresh', sessionId, error);
    }
  });
}

/** Option B — stamp active plan goal when the coach creates sessions without an explicit goal. */
export async function resolveCoachDefaultGoalId(athleteId: string): Promise<string | null> {
  const [plan, goals] = await Promise.all([getActiveTrainingPlan(athleteId), getGoals(athleteId)]);
  const fromPlan = resolveDefaultPlanGoalId(plan?.goalId, selectableDatedGoalIds(goals));
  if (fromPlan) {
    return fromPlan;
  }
  if (!plan?.goalId) {
    return null;
  }
  const goal = await getGoalById(athleteId, plan.goalId);
  if (!goal || goal.achieved) {
    return null;
  }
  return plan.goalId;
}

export const typeEnum = z.enum(['RUN', 'BIKE', 'SWIM', 'STRENGTH']);
export const intensityEnum = z.enum([
  'RECOVERY',
  'ENDURANCE',
  'TEMPO',
  'THRESHOLD',
  'VO2MAX',
  'RACE',
]);
export const exposureEnum = z.enum(['INDOOR', 'OUTDOOR', 'UNKNOWN']);
export const travelDisciplineEnum = z.enum(['RUN', 'BIKE', 'SWIM', 'STRENGTH', 'MOBILITY']);

export function coachTypeEnumForSports(sports: readonly PracticedSportId[]) {
  const allowed = coachActivityTypesForPracticed(sports);
  if (allowed.length === 0) {
    return typeEnum;
  }
  if (allowed.length === 1) {
    return z.enum([allowed[0]]);
  }
  return z.enum(allowed as [CoachActivityType, ...CoachActivityType[]]);
}

export function travelDisciplineEnumForSports(sports: readonly PracticedSportId[]) {
  const allowed = travelDisciplinesForPracticed(sports);
  if (allowed.length === 0) {
    return travelDisciplineEnum;
  }
  if (allowed.length === 1) {
    return z.enum([allowed[0]]);
  }
  return z.enum(allowed as [TravelDiscipline, ...TravelDiscipline[]]);
}

export function rejectIfSportNotPracticed(
  type: string,
  practicedSports: readonly PracticedSportId[],
): { ok: false; error: string } | null {
  if (isCoachActivityTypeAllowed(type, practicedSports)) {
    return null;
  }
  return {
    ok: false as const,
    error: `Sport ${type} hors sports pratiqués — propose uniquement ${coachActivityTypesForPracticed(practicedSports).join(', ')}.`,
  };
}

export const toDate = (d: string) => new Date(`${d}T12:00:00`);

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
export const startTimeSchema = z
  .string()
  .regex(timeRegex, 'Heure au format HH:mm')
  .optional()
  .describe(
    "Heure de début 'HH:mm' (locale). Laisse vide pour que l'app place automatiquement la séance sur un créneau libre de l'agenda Google.",
  );

export const endurancePrescriptionToolSchema = coachEndurancePrescriptionSchema
  .optional()
  .describe(
    "Déroulé structuré pour RUN et BIKE : étapes et groupes répétés, chacun avec son intensité. L'app en dérive les cibles chiffrées et la description de la séance. Omettre pour STRENGTH, ou pour une sortie sans structure (l'app enverra alors un bloc unique).",
  );

export const strengthPrescriptionToolSchema = coachStrengthPrescriptionSchema
  .optional()
  .describe(
    'OBLIGATOIRE si type=STRENGTH : exercices structurés (séries/reps). Omettre pour RUN/BIKE/SWIM.',
  );

export function coachToolFailure(prefix: string, error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);
  return { ok: false as const, error: `${prefix} : ${detail}` };
}

export function roundOptionalMetric(value: number | null | undefined): number | null {
  if (value === undefined || value === null || value === undefined) {
    return null;
  }
  return Math.round(value);
}

export type CoachPlannedSessionInput = {
  type: 'RUN' | 'BIKE' | 'SWIM' | 'STRENGTH';
  date: string;
  startTime?: string;
  title: string;
  description?: string;
  strengthPrescription?: z.infer<typeof strengthPrescriptionToolSchema>;
  endurancePrescription?: z.infer<typeof endurancePrescriptionToolSchema>;
  durationMin?: number;
  load?: number;
  intensity?: z.infer<typeof intensityEnum>;
  exposureSetting?: z.infer<typeof exposureEnum>;
  locationLabel?: string;
  locationLat?: number;
  locationLng?: number;
};

export type CoachPlannedSessionResolved = {
  strength: ReturnType<typeof resolveStrengthFieldsForPersist>;
  endurance: ReturnType<typeof resolveEnduranceFieldsForPersist>;
  goalId: string | null;
};

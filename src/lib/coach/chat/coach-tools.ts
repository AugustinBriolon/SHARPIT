import { Prisma } from '@prisma/client';
import { after } from 'next/server';
import { tool } from 'ai';
import { addDays, startOfDay } from 'date-fns';
import { z } from 'zod';
import {
  deleteSessionFromGoogle,
  getGoogleAccount,
  getUpcomingBusy,
  pushSessionToGoogleInBackground,
} from '@/lib/integrations/google/google-sync';
import {
  createBrickSessions,
  createPlannedSession,
  deletePlannedSession,
  getActiveTrainingPlan,
  getGoalById,
  getGoals,
  getPlannedSessionById,
  getPlannedSessions,
  updatePlannedSession,
} from '@/lib/queries';
import {
  createTravelContext,
  applyTravelContextToUpcomingSessions,
} from '@/lib/travel-context/service';
import { prisma } from '@/lib/prisma';
import { refreshAndPersistPlannedSessionContext } from '@/lib/planned-session/resolve-context';
import { resolveDefaultPlanGoalId, selectableDatedGoalIds } from '@/lib/planned-session/plan-goal';
import {
  coachStrengthPrescriptionSchema,
  parseStrengthPrescription,
  resolveStrengthFieldsForPersist,
} from '@/lib/planned-session/strength/strength-prescription';
import {
  coachEndurancePrescriptionSchema,
  resolveEnduranceFieldsForPersist,
} from '@/lib/planned-session/endurance/coach-endurance-prescription';
import { dayKeyFromDate } from '@/lib/date/day-key';
import { garminPushClearOnSessionChange } from '@/lib/integrations/garmin/garmin-workout-push-state';
import { auditStrengthPrescription } from '@/lib/planned-session/strength/strength-session-template';
import { suggestGarminTaxonomy } from '@/lib/integrations/garmin/garmin-exercise-taxonomy';
import {
  formatScenarioComparisonForCoach,
  loadScenarioComparisonForCoach,
} from '@/lib/presentation/scenario-comparison';

function scheduleSessionContextRefresh(athleteId: string, sessionId: string) {
  after(async () => {
    try {
      await refreshAndPersistPlannedSessionContext(athleteId, sessionId);
    } catch (error) {
      console.error('[coach] session context refresh', sessionId, error);
    }
  });
}

/** Option B — stamp active plan goal when the coach creates sessions without an explicit goal. */
async function resolveCoachDefaultGoalId(athleteId: string): Promise<string | null> {
  const [plan, goals] = await Promise.all([getActiveTrainingPlan(athleteId), getGoals(athleteId)]);
  const fromPlan = resolveDefaultPlanGoalId(plan?.goalId, selectableDatedGoalIds(goals));
  if (fromPlan) {
    return fromPlan;
  }
  // Fallback: plan goal still exists even if undated / past filter edge cases.
  if (!plan?.goalId) {
    return null;
  }
  const goal = await getGoalById(athleteId, plan.goalId);
  if (!goal || goal.achieved) {
    return null;
  }
  return plan.goalId;
}

const typeEnum = z.enum(['RUN', 'BIKE', 'SWIM', 'STRENGTH']);
const intensityEnum = z.enum(['RECOVERY', 'ENDURANCE', 'TEMPO', 'THRESHOLD', 'VO2MAX', 'RACE']);
const exposureEnum = z.enum(['INDOOR', 'OUTDOOR', 'UNKNOWN']);

const toDate = (d: string) => new Date(`${d}T12:00:00`);

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const startTimeSchema = z
  .string()
  .regex(timeRegex, 'Heure au format HH:mm')
  .optional()
  .describe(
    "Heure de début 'HH:mm' (locale). Laisse vide pour que l'app place automatiquement la séance sur un créneau libre de l'agenda Google.",
  );

const endurancePrescriptionToolSchema = coachEndurancePrescriptionSchema
  .optional()
  .describe(
    "Déroulé structuré pour RUN et BIKE : étapes et groupes répétés, chacun avec son intensité. L'app en dérive les cibles chiffrées et la description de la séance. Omettre pour STRENGTH, ou pour une sortie sans structure (l'app enverra alors un bloc unique).",
  );

const strengthPrescriptionToolSchema = coachStrengthPrescriptionSchema
  .optional()
  .describe(
    'OBLIGATOIRE si type=STRENGTH : exercices structurés (séries/reps). Omettre pour RUN/BIKE/SWIM.',
  );

function coachToolFailure(prefix: string, error: unknown) {
  const detail = error instanceof Error ? error.message : String(error);
  return { ok: false as const, error: `${prefix} : ${detail}` };
}

function roundOptionalMetric(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  return Math.round(value);
}

type CoachPlannedSessionInput = {
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

type CoachPlannedSessionResolved = {
  strength: ReturnType<typeof resolveStrengthFieldsForPersist>;
  endurance: ReturnType<typeof resolveEnduranceFieldsForPersist>;
  goalId: string | null;
};

function buildCoachPlannedSessionLocationFields(input: CoachPlannedSessionInput) {
  return {
    exposureSetting: input.exposureSetting ?? null,
    locationLabel: input.locationLabel ?? null,
    locationLat: input.locationLat ?? null,
    locationLng: input.locationLng ?? null,
  };
}

function buildCoachPlannedSessionPayload(
  input: CoachPlannedSessionInput,
  resolved: CoachPlannedSessionResolved,
) {
  return {
    type: input.type,
    date: toDate(input.date),
    startTime: input.startTime ?? null,
    title: input.title,
    description: resolved.endurance.description,
    strengthPrescription: resolved.strength.strengthPrescription ?? undefined,
    endurancePrescription: resolved.endurance.endurancePrescription ?? undefined,
    durationMin: roundOptionalMetric(input.durationMin),
    load: roundOptionalMetric(input.load),
    intensity: input.intensity ?? null,
    goalId: resolved.goalId,
    ...buildCoachPlannedSessionLocationFields(input),
  };
}

async function createCoachPlannedSessionRecord(
  athleteId: string,
  input: CoachPlannedSessionInput,
  resolved: CoachPlannedSessionResolved,
) {
  return createPlannedSession(athleteId, buildCoachPlannedSessionPayload(input, resolved));
}

async function executeCreatePlannedSessionTool(
  athleteId: string,
  input: {
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
  },
) {
  const strength = resolveStrengthFieldsForPersist({
    type: input.type,
    description: input.description,
    strengthPrescription: input.strengthPrescription,
  });
  const endurance = resolveEnduranceFieldsForPersist({
    type: input.type,
    description: strength.description,
    intensity: input.intensity ?? null,
    endurancePrescription: input.endurancePrescription,
  });
  const goalId = await resolveCoachDefaultGoalId(athleteId);
  const s = await createCoachPlannedSessionRecord(athleteId, input, {
    strength,
    endurance,
    goalId,
  });

  pushSessionToGoogleInBackground(s);
  scheduleSessionContextRefresh(athleteId, s.id);

  return {
    ok: true as const,
    id: s.id,
    action: 'created' as const,
    date: input.date,
    startTime: input.startTime ?? null,
    type: input.type,
    title: input.title,
    addedToGoogle: false,
    strengthAudit: auditStrengthPrescription({
      durationMin: input.durationMin,
      prescription: strength.strengthPrescription,
    }),
  };
}

function applyPlannedSessionScheduleUpdate(
  input: { date?: string; startTime?: string },
  data: Prisma.PlannedSessionUncheckedUpdateInput,
): void {
  if (input.date) {
    data.date = toDate(input.date);
  }
  if (input.startTime !== undefined) {
    data.startTime = input.startTime;
  }
}

function applyPlannedSessionMetaUpdate(
  input: {
    type?: z.infer<typeof typeEnum>;
    intensity?: z.infer<typeof intensityEnum>;
    title?: string;
    description?: string;
    durationMin?: number;
    load?: number;
  },
  data: Prisma.PlannedSessionUncheckedUpdateInput,
): void {
  if (input.type) {
    data.type = input.type;
  }
  if (input.intensity) {
    data.intensity = input.intensity;
  }
  if (input.title !== undefined) {
    data.title = input.title;
  }
  if (input.description !== undefined) {
    data.description = input.description;
  }
  if (input.durationMin !== undefined) {
    data.durationMin = input.durationMin;
  }
  if (input.load !== undefined) {
    data.load = input.load;
  }
}

function applyPlannedSessionLocationUpdate(
  input: {
    exposureSetting?: z.infer<typeof exposureEnum>;
    locationLabel?: string;
    locationLat?: number;
    locationLng?: number;
  },
  data: Prisma.PlannedSessionUncheckedUpdateInput,
): void {
  if (input.exposureSetting !== undefined) {
    data.exposureSetting = input.exposureSetting;
  }
  if (input.locationLabel !== undefined) {
    data.locationLabel = input.locationLabel;
  }
  if (input.locationLat !== undefined) {
    data.locationLat = input.locationLat;
  }
  if (input.locationLng !== undefined) {
    data.locationLng = input.locationLng;
  }
}

function applyScalarPlannedSessionUpdate(
  input: {
    date?: string;
    startTime?: string;
    type?: z.infer<typeof typeEnum>;
    intensity?: z.infer<typeof intensityEnum>;
    title?: string;
    description?: string;
    durationMin?: number;
    load?: number;
    exposureSetting?: z.infer<typeof exposureEnum>;
    locationLabel?: string;
    locationLat?: number;
    locationLng?: number;
  },
  data: Prisma.PlannedSessionUncheckedUpdateInput,
): void {
  applyPlannedSessionScheduleUpdate(input, data);
  applyPlannedSessionMetaUpdate(input, data);
  applyPlannedSessionLocationUpdate(input, data);
}

function applyStrengthPrescriptionUpdate(
  input: {
    type?: z.infer<typeof typeEnum>;
    description?: string;
    strengthPrescription?: z.infer<typeof strengthPrescriptionToolSchema>;
  },
  existing: NonNullable<Awaited<ReturnType<typeof getPlannedSessionById>>>,
  data: Prisma.PlannedSessionUncheckedUpdateInput,
): void {
  const nextType = input.type ?? existing.type;
  if (input.strengthPrescription !== undefined) {
    const strength = resolveStrengthFieldsForPersist({
      type: nextType,
      description: input.description !== undefined ? input.description : existing.description,
      strengthPrescription: input.strengthPrescription,
    });
    data.description = strength.description;
    data.strengthPrescription =
      strength.strengthPrescription === null ? Prisma.DbNull : strength.strengthPrescription;
    return;
  }
  if (input.type && input.type !== 'STRENGTH') {
    data.strengthPrescription = Prisma.DbNull;
  }
}

function applyEndurancePrescriptionUpdate(
  input: {
    type?: z.infer<typeof typeEnum>;
    description?: string;
    intensity?: z.infer<typeof intensityEnum>;
    endurancePrescription?: z.infer<typeof endurancePrescriptionToolSchema>;
  },
  existing: NonNullable<Awaited<ReturnType<typeof getPlannedSessionById>>>,
  data: Prisma.PlannedSessionUncheckedUpdateInput,
): void {
  const nextType = input.type ?? existing.type;
  if (input.endurancePrescription !== undefined) {
    const endurance = resolveEnduranceFieldsForPersist({
      type: nextType,
      description: typeof data.description === 'string' ? data.description : null,
      intensity: input.intensity ?? existing.intensity,
      endurancePrescription: input.endurancePrescription,
    });
    data.description = endurance.description;
    data.endurancePrescription =
      endurance.endurancePrescription === null ? Prisma.DbNull : endurance.endurancePrescription;
    return;
  }
  if (input.type === 'STRENGTH') {
    data.endurancePrescription = Prisma.DbNull;
  }
}

function applyPrescriptionUpdates(
  input: {
    type?: z.infer<typeof typeEnum>;
    description?: string;
    intensity?: z.infer<typeof intensityEnum>;
    strengthPrescription?: z.infer<typeof strengthPrescriptionToolSchema>;
    endurancePrescription?: z.infer<typeof endurancePrescriptionToolSchema>;
    date?: string;
  },
  existing: NonNullable<Awaited<ReturnType<typeof getPlannedSessionById>>>,
  data: Prisma.PlannedSessionUncheckedUpdateInput,
): void {
  applyStrengthPrescriptionUpdate(input, existing, data);
  applyEndurancePrescriptionUpdate(input, existing, data);
  Object.assign(
    data,
    garminPushClearOnSessionChange({
      ...(input.strengthPrescription !== undefined
        ? { strengthPrescription: input.strengthPrescription }
        : {}),
      ...(input.endurancePrescription !== undefined
        ? { endurancePrescription: input.endurancePrescription }
        : {}),
      ...(input.date ? { date: input.date } : {}),
    }) ?? {},
  );
}

async function executeUpdatePlannedSessionTool(
  athleteId: string,
  input: {
    id: string;
    date?: string;
    startTime?: string;
    type?: z.infer<typeof typeEnum>;
    intensity?: z.infer<typeof intensityEnum>;
    title?: string;
    description?: string;
    strengthPrescription?: z.infer<typeof strengthPrescriptionToolSchema>;
    endurancePrescription?: z.infer<typeof endurancePrescriptionToolSchema>;
    durationMin?: number;
    load?: number;
    exposureSetting?: z.infer<typeof exposureEnum>;
    locationLabel?: string;
    locationLat?: number;
    locationLng?: number;
  },
) {
  const existing = await getPlannedSessionById(athleteId, input.id);
  if (!existing) {
    return { ok: false as const, error: 'Séance introuvable' };
  }
  const data: Prisma.PlannedSessionUncheckedUpdateInput = {};
  applyScalarPlannedSessionUpdate(input, data);
  applyPrescriptionUpdates(input, existing, data);

  const s = await updatePlannedSession(athleteId, input.id, data);
  if (!s) {
    return { ok: false as const, error: 'Séance introuvable.' };
  }
  scheduleSessionContextRefresh(athleteId, s.id);
  pushSessionToGoogleInBackground(s);

  return {
    ok: true as const,
    id: s.id,
    action: 'updated' as const,
    date: dayKeyFromDate(s.date),
    startTime: s.startTime,
    type: s.type,
    title: s.title,
    strengthAudit: auditStrengthPrescription({
      durationMin: input.durationMin ?? existing.durationMin,
      prescription: parseStrengthPrescription(s.strengthPrescription),
    }),
  };
}

async function executeCreateBrickSessionTool(
  athleteId: string,
  input: {
    date: string;
    startTime?: string;
    title?: string;
    legs: Array<{
      type: z.infer<typeof typeEnum>;
      intensity?: z.infer<typeof intensityEnum>;
      title: string;
      description?: string;
      durationMin?: number;
      load?: number;
    }>;
  },
) {
  const goalId = await resolveCoachDefaultGoalId(athleteId);
  const created = await createBrickSessions(
    athleteId,
    input.legs.map((leg) => ({
      type: leg.type,
      date: toDate(input.date),
      startTime: input.startTime ?? null,
      title: leg.title,
      description: leg.description ?? null,
      durationMin: leg.durationMin !== null ? Math.round(leg.durationMin) : null,
      load: leg.load !== null ? Math.round(leg.load) : null,
      intensity: leg.intensity ?? null,
      goalId,
    })),
  );

  for (const s of created) {
    pushSessionToGoogleInBackground(s);
  }

  return {
    ok: true as const,
    action: 'created' as const,
    brickGroupId: created[0]?.brickGroupId ?? null,
    date: input.date,
    title: input.title ?? created[0]?.title ?? 'Brick',
    legs: created.map((s) => ({
      id: s.id,
      type: s.type,
      title: s.title,
      brickOrder: s.brickOrder,
    })),
  };
}

/**
 * Tous s'exécutent côté serveur et renvoient un résumé compact.
 */
export function createCoachTools(athleteId: string) {
  return {
    listPlannedSessions: tool({
      description:
        'Liste les séances planifiées à venir avec leur id. Inutile si les id sont déjà dans le contexte système — à utiliser seulement pour un horizon plus long ou après une mutation validée.',
      inputSchema: z.object({
        days: z.number().int().min(1).max(60).optional().describe('Horizon en jours (défaut 21).'),
      }),
      execute: async ({ days = 21 }) => {
        const today = startOfDay(new Date());
        const sessions = await getPlannedSessions(athleteId, {
          from: today,
          to: addDays(today, days),
        });
        return sessions.map((s) => ({
          id: s.id,
          date: dayKeyFromDate(s.date),
          type: s.type,
          intensity: s.intensity,
          title: s.title,
          durationMin: s.durationMin,
          load: s.load,
          completed: s.completed,
          brickGroupId: s.brickGroupId,
          brickOrder: s.brickOrder,
          hasStrengthPrescription: Boolean(parseStrengthPrescription(s.strengthPrescription)),
        }));
      },
    }),

    getScenarioProjection: tool({
      description:
        "Charge une comparaison de scénarios d'entraînement (projections sur l'horizon). À appeler UNIQUEMENT si l'athlète demande explicitement une projection, une comparaison d'options de plan, ou « que se passe-t-il si… ». Pas pour une simple réadaptation de séance (sommeil/récup/environnement suffisent).",
      inputSchema: z.object({
        horizonDays: z
          .union([z.literal(7), z.literal(14)])
          .optional()
          .describe('Horizon de projection (défaut 7).'),
      }),
      execute: async ({ horizonDays = 7 }) => {
        const comparison = await loadScenarioComparisonForCoach(athleteId, {
          horizonDays,
        });
        const text = formatScenarioComparisonForCoach(comparison);
        if (!text) {
          return {
            ok: false as const,
            error: 'Aucune comparaison de scénarios disponible pour cet horizon.',
          };
        }
        return { ok: true as const, markdown: text };
      },
    }),

    searchWatchExercises: tool({
      description:
        "Cherche les exercices du catalogue Garmin Connect correspondant à un mouvement. Utilise-le pour nommer les exercices d'une séance STRENGTH avec des libellés que la montre affiche tels quels. Un libellé hors catalogue reste envoyé, mais sous un nom générique.",
      inputSchema: z.object({
        query: z
          .string()
          .min(2)
          .max(120)
          .describe('Mouvement recherché en français (ex. « pont fessier élastique »).'),
        limit: z
          .number()
          .int()
          .min(1)
          .max(10)
          .optional()
          .describe('Nombre de suggestions (défaut 5).'),
      }),
      execute: async ({ query, limit = 5 }) => {
        const matches = suggestGarminTaxonomy(query, limit);
        return {
          query,
          matches: matches.map((match) => ({
            label: match.labelFr,
            exerciseName: match.ref.exerciseName,
            category: match.ref.category,
            confidence: match.confidence,
          })),
        };
      },
    }),

    createPlannedSession: tool({
      description:
        'Crée UNE séance planifiée pour UN SEUL sport. Ne pas utiliser pour un enchaînement multisport (vélo+course, etc.) : utilise createBrickSession à la place.',
      inputSchema: z.object({
        date: z.string().describe('Date au format yyyy-MM-dd.'),
        startTime: startTimeSchema,
        type: typeEnum,
        intensity: intensityEnum.optional(),
        title: z.string().describe('Titre court de la séance.'),
        description: z
          .string()
          .optional()
          .describe('Structure détaillée (échauffement, corps, récup).'),
        strengthPrescription: strengthPrescriptionToolSchema,
        endurancePrescription: endurancePrescriptionToolSchema,
        durationMin: z.number().min(5).max(420).optional(),
        load: z.number().min(0).max(400).optional().describe('TSS estimé.'),
        exposureSetting: exposureEnum
          .optional()
          .describe('INDOOR, OUTDOOR ou UNKNOWN. OUTDOOR si séance dehors.'),
        locationLabel: z
          .string()
          .optional()
          .describe("Ville ou lieu (ex. Les Sables-d'Olonne). Géocodé automatiquement."),
        locationLat: z.number().optional(),
        locationLng: z.number().optional(),
      }),
      execute: async (input) => {
        try {
          return await executeCreatePlannedSessionTool(athleteId, input);
        } catch (error) {
          console.error('[coach] createPlannedSession', error);
          return coachToolFailure("Impossible d'ajouter la séance", error);
        }
      },
    }),

    createBrickSession: tool({
      description:
        "Crée une séance BRICK / multisport : un enchaînement de plusieurs jambes le même jour (ex. vélo puis course à pied), à utiliser pour le triathlon. Chaque jambe est créée comme une séance autonome (un sport chacune) mais elles sont regroupées : l'athlète pourra ainsi lier l'activité Strava correspondante à CHAQUE jambe et obtenir une analyse par sport. Préfère cet outil à createPlannedSession dès que la séance combine plusieurs sports enchaînés.",
      inputSchema: z.object({
        date: z.string().describe('Date commune au format yyyy-MM-dd.'),
        startTime: startTimeSchema,
        title: z
          .string()
          .optional()
          .describe('Titre global du brick (ex. « Brick vélo+course T2 »). Optionnel.'),
        legs: z
          .array(
            z.object({
              type: typeEnum,
              intensity: intensityEnum.optional(),
              title: z.string().describe('Titre court de la jambe.'),
              description: z
                .string()
                .optional()
                .describe('Structure de la jambe (échauffement, corps, récup).'),
              durationMin: z.number().min(5).max(420).optional(),
              load: z.number().min(0).max(400).optional().describe('TSS estimé de la jambe.'),
            }),
          )
          .min(2)
          .describe("Les jambes du brick, dans l'ordre d'enchaînement (ex. [vélo, course])."),
      }),
      execute: async (input) => {
        try {
          return await executeCreateBrickSessionTool(athleteId, input);
        } catch (error) {
          console.error('[coach] createBrickSession', error);
          return coachToolFailure('Impossible de créer le brick', error);
        }
      },
    }),

    updatePlannedSession: tool({
      description:
        'Modifie une séance planifiée existante (identifiée par son id). Ne renseigne que les champs à changer.',
      inputSchema: z.object({
        id: z
          .string()
          .describe('id de la séance (contexte « Déjà planifié » ou listPlannedSessions).'),
        date: z.string().optional().describe('Nouvelle date yyyy-MM-dd.'),
        startTime: startTimeSchema,
        type: typeEnum.optional(),
        intensity: intensityEnum.optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        strengthPrescription: strengthPrescriptionToolSchema,
        endurancePrescription: endurancePrescriptionToolSchema,
        durationMin: z.number().int().min(5).max(420).optional(),
        load: z.number().int().min(0).max(400).optional(),
        exposureSetting: exposureEnum.optional(),
        locationLabel: z.string().optional(),
        locationLat: z.number().optional(),
        locationLng: z.number().optional(),
      }),
      execute: async (input) => {
        try {
          return await executeUpdatePlannedSessionTool(athleteId, input);
        } catch (error) {
          console.error('[coach] updatePlannedSession', error);
          return coachToolFailure('Impossible de modifier la séance', error);
        }
      },
    }),

    deletePlannedSession: tool({
      description: 'Supprime une séance planifiée (identifiée par son id).',
      inputSchema: z.object({
        id: z
          .string()
          .describe('id de la séance (contexte « Déjà planifié » ou listPlannedSessions).'),
      }),
      execute: async ({ id }) => {
        const existing = await getPlannedSessionById(athleteId, id);
        if (!existing) {
          return { ok: false as const, error: 'Séance introuvable' };
        }

        if (existing.googleEventId) {
          try {
            await deleteSessionFromGoogle(existing);
          } catch (error) {
            console.error('Suppression Google Calendar échouée', error);
          }
        }

        await deletePlannedSession(athleteId, id);
        return {
          ok: true,
          id,
          action: 'deleted' as const,
          title: existing.title,
          date: dayKeyFromDate(existing.date),
        };
      },
    }),

    setTravelContext: tool({
      description:
        "Enregistre un contexte voyage (ville + dates) pour pré-remplir les séances outdoor et améliorer les prévisions météo. À utiliser quand l'athlète mentionne des vacances, un déplacement ou un camp d'entraînement — c'est-à-dire qu'il n'est pas chez lui. Si la capacité d'entraînement est réduite sans déplacement (maladie, blessure, semaine de travail chargée), utilise setTrainingConstraint à la place.",
      inputSchema: z.object({
        locationLabel: z.string().describe("Ville ou lieu (ex. Les Sables-d'Olonne)."),
        startDate: z.string().describe('Date de début yyyy-MM-dd.'),
        endDate: z.string().describe('Date de fin yyyy-MM-dd.'),
        label: z.string().optional().describe('Titre court (ex. Vacances juillet).'),
        note: z.string().optional(),
        allowedDisciplines: z
          .array(z.enum(['RUN', 'BIKE', 'SWIM', 'STRENGTH', 'MOBILITY']))
          .optional()
          .describe(
            'Sports possibles pendant le voyage. MOBILITY = mobilité/étirements. Vide = tout autorisé.',
          ),
        noStructuredTraining: z
          .boolean()
          .optional()
          .describe('true = aucun sport structuré pendant le voyage.'),
        trainingConstraint: z
          .enum(['FULL', 'REDUCED', 'MOBILITY_ONLY', 'NONE'])
          .optional()
          .describe(
            'Optionnel si allowedDisciplines est fourni (déduit automatiquement). MOBILITY_ONLY si uniquement mobilité.',
          ),
        applyToPlannedSessions: z
          .boolean()
          .optional()
          .describe('Appliquer aux séances planifiées dans la période (défaut true).'),
      }),
      execute: async (input) => {
        try {
          const travel = await createTravelContext(prisma, athleteId, {
            label: input.label ?? null,
            locationLabel: input.locationLabel,
            startDate: toDate(input.startDate),
            endDate: toDate(input.endDate),
            note: input.note ?? null,
            allowedDisciplines: input.allowedDisciplines ?? [],
            noStructuredTraining: input.noStructuredTraining,
            trainingConstraint: input.trainingConstraint ?? null,
            source: 'COACH',
          });
          const updatedSessions =
            input.applyToPlannedSessions === false
              ? 0
              : await applyTravelContextToUpcomingSessions(prisma, athleteId, travel.id);
          return {
            ok: true as const,
            travelId: travel.id,
            locationLabel: travel.locationLabel,
            updatedSessions,
          };
        } catch (error) {
          console.error('[coach/setTravelContext]', error);
          return {
            ok: false as const,
            error:
              error instanceof Error ? error.message : 'Impossible de créer le contexte voyage',
          };
        }
      },
    }),

    setTrainingConstraint: tool({
      description:
        "Enregistre une contrainte temporaire (dates + capacité d'entraînement réduite) SANS lieu — à utiliser quand l'athlète n'est PAS en déplacement mais a une capacité réduite : maladie, blessure, semaine de travail chargée, etc. Si l'athlète mentionne être ailleurs que chez lui, utilise setTravelContext à la place.",
      inputSchema: z.object({
        startDate: z.string().describe('Date de début yyyy-MM-dd.'),
        endDate: z.string().describe('Date de fin yyyy-MM-dd.'),
        label: z.string().optional().describe('Titre court (ex. Tendinite genou).'),
        note: z.string().optional(),
        allowedDisciplines: z
          .array(z.enum(['RUN', 'BIKE', 'SWIM', 'STRENGTH', 'MOBILITY']))
          .optional()
          .describe(
            'Sports encore possibles pendant cette période. MOBILITY = mobilité/étirements. Vide = tout autorisé.',
          ),
        noStructuredTraining: z
          .boolean()
          .optional()
          .describe('true = aucun sport structuré pendant cette période.'),
        trainingConstraint: z
          .enum(['FULL', 'REDUCED', 'MOBILITY_ONLY', 'NONE'])
          .optional()
          .describe(
            'Optionnel si allowedDisciplines est fourni (déduit automatiquement). MOBILITY_ONLY si uniquement mobilité.',
          ),
      }),
      execute: async (input) => {
        try {
          const constraint = await createTravelContext(prisma, athleteId, {
            type: 'CONSTRAINT',
            label: input.label ?? null,
            startDate: toDate(input.startDate),
            endDate: toDate(input.endDate),
            note: input.note ?? null,
            allowedDisciplines: input.allowedDisciplines ?? [],
            noStructuredTraining: input.noStructuredTraining,
            trainingConstraint: input.trainingConstraint ?? null,
            source: 'COACH',
          });
          return {
            ok: true as const,
            constraintId: constraint.id,
            trainingConstraint: constraint.trainingConstraint,
          };
        } catch (error) {
          console.error('[coach/setTrainingConstraint]', error);
          return {
            ok: false as const,
            error: error instanceof Error ? error.message : 'Impossible de créer la contrainte',
          };
        }
      },
    }),

    getCalendarAvailability: tool({
      description:
        "Liste les créneaux OCCUPÉS de l'agenda Google de l'athlète (tous calendriers confondus) sur les prochains jours, pour placer les séances sur des créneaux libres. À appeler avant de proposer des horaires précis. Renvoie une liste vide si Google Calendar n'est pas connecté.",
      inputSchema: z.object({
        days: z.number().int().min(1).max(30).optional().describe('Horizon en jours (défaut 14).'),
      }),
      execute: async ({ days = 14 }) => {
        const account = await getGoogleAccount(athleteId);
        if (!account) {
          return { connected: false as const, busy: [] };
        }
        try {
          const busy = await getUpcomingBusy(athleteId, days);
          return {
            connected: true as const,
            timeZone: account.timeZone,
            busy,
          };
        } catch (error) {
          console.error('Lecture agenda Google échouée', error);
          return { connected: true as const, busy: [], error: 'fetch_failed' };
        }
      },
    }),
  };
}

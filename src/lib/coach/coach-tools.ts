import { Prisma } from '@prisma/client';
import { tool } from 'ai';
import { addDays, format, startOfDay } from 'date-fns';
import { z } from 'zod';
import {
  deleteSessionFromGoogle,
  getGoogleAccount,
  getUpcomingBusy,
  pushSessionToGoogleInBackground,
} from '@/lib/integrations/google-sync';
import {
  createBrickSessions,
  createPlannedSession,
  deletePlannedSession,
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
import {
  coachStrengthPrescriptionSchema,
  parseStrengthPrescription,
  resolveStrengthFieldsForPersist,
} from '@/lib/planned-session/strength-prescription';

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

const strengthPrescriptionToolSchema = coachStrengthPrescriptionSchema
  .optional()
  .describe(
    'OBLIGATOIRE si type=STRENGTH : exercices structurés (séries/reps). Omettre pour RUN/BIKE/SWIM.',
  );

/**
 * Outils donnés au Coach IA pour agir directement sur les séances planifiées.
 * Tous s'exécutent côté serveur et renvoient un résumé compact.
 */
export const coachTools = {
  listPlannedSessions: tool({
    description:
      'Liste les séances planifiées à venir avec leur id, pour pouvoir les modifier ou supprimer. À appeler avant toute modification/suppression pour récupérer les bons id.',
    inputSchema: z.object({
      days: z.number().int().min(1).max(60).optional().describe('Horizon en jours (défaut 21).'),
    }),
    execute: async ({ days = 21 }) => {
      const today = startOfDay(new Date());
      const sessions = await getPlannedSessions({
        from: today,
        to: addDays(today, days),
      });
      return sessions.map((s) => ({
        id: s.id,
        date: format(s.date, 'yyyy-MM-dd'),
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
        const strength = resolveStrengthFieldsForPersist({
          type: input.type,
          description: input.description,
          strengthPrescription: input.strengthPrescription,
        });
        const s = await createPlannedSession({
          type: input.type,
          date: toDate(input.date),
          startTime: input.startTime ?? null,
          title: input.title,
          description: strength.description,
          strengthPrescription: strength.strengthPrescription ?? undefined,
          durationMin: input.durationMin != null ? Math.round(input.durationMin) : null,
          load: input.load != null ? Math.round(input.load) : null,
          intensity: input.intensity ?? null,
          exposureSetting: input.exposureSetting ?? null,
          locationLabel: input.locationLabel ?? null,
          locationLat: input.locationLat ?? null,
          locationLng: input.locationLng ?? null,
        });

        pushSessionToGoogleInBackground(s);

        try {
          await refreshAndPersistPlannedSessionContext(s.id);
        } catch (error) {
          console.error('[coach/createPlannedSession/context]', error);
        }

        return {
          ok: true,
          id: s.id,
          action: 'created' as const,
          date: input.date,
          startTime: input.startTime ?? null,
          type: input.type,
          title: input.title,
          addedToGoogle: false,
        };
      } catch (error) {
        console.error('[coach] createPlannedSession', error);
        const detail = error instanceof Error ? error.message : String(error);
        return {
          ok: false as const,
          error: `Impossible d'ajouter la séance : ${detail}`,
        };
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
        const created = await createBrickSessions(
          input.legs.map((leg) => ({
            type: leg.type,
            date: toDate(input.date),
            startTime: input.startTime ?? null,
            title: leg.title,
            description: leg.description ?? null,
            durationMin: leg.durationMin != null ? Math.round(leg.durationMin) : null,
            load: leg.load != null ? Math.round(leg.load) : null,
            intensity: leg.intensity ?? null,
          })),
        );

        for (const s of created) {
          pushSessionToGoogleInBackground(s);
        }

        const brickGroupId = created[0]?.brickGroupId ?? null;

        return {
          ok: true as const,
          action: 'created' as const,
          brickGroupId,
          date: input.date,
          title: input.title ?? created[0]?.title ?? 'Brick',
          legs: created.map((s) => ({
            id: s.id,
            type: s.type,
            title: s.title,
            brickOrder: s.brickOrder,
          })),
        };
      } catch (error) {
        console.error('[coach] createBrickSession', error);
        const detail = error instanceof Error ? error.message : String(error);
        return {
          ok: false as const,
          error: `Impossible de créer le brick : ${detail}`,
        };
      }
    },
  }),

  updatePlannedSession: tool({
    description:
      'Modifie une séance planifiée existante (identifiée par son id). Ne renseigne que les champs à changer.',
    inputSchema: z.object({
      id: z.string().describe('id de la séance (via listPlannedSessions).'),
      date: z.string().optional().describe('Nouvelle date yyyy-MM-dd.'),
      startTime: startTimeSchema,
      type: typeEnum.optional(),
      intensity: intensityEnum.optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      strengthPrescription: strengthPrescriptionToolSchema,
      durationMin: z.number().int().min(5).max(420).optional(),
      load: z.number().int().min(0).max(400).optional(),
      exposureSetting: exposureEnum.optional(),
      locationLabel: z.string().optional(),
      locationLat: z.number().optional(),
      locationLng: z.number().optional(),
    }),
    execute: async (input) => {
      try {
        const existing = await getPlannedSessionById(input.id);
        if (!existing) {
          return { ok: false as const, error: 'Séance introuvable' };
        }
        const data: Prisma.PlannedSessionUncheckedUpdateInput = {};
        if (input.date) data.date = toDate(input.date);
        if (input.startTime !== undefined) data.startTime = input.startTime;
        if (input.type) data.type = input.type;
        if (input.intensity) data.intensity = input.intensity;
        if (input.title !== undefined) data.title = input.title;
        if (input.description !== undefined) data.description = input.description;
        if (input.durationMin !== undefined) data.durationMin = input.durationMin;
        if (input.load !== undefined) data.load = input.load;
        if (input.exposureSetting !== undefined) data.exposureSetting = input.exposureSetting;
        if (input.locationLabel !== undefined) data.locationLabel = input.locationLabel;
        if (input.locationLat !== undefined) data.locationLat = input.locationLat;
        if (input.locationLng !== undefined) data.locationLng = input.locationLng;

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
        } else if (input.type && input.type !== 'STRENGTH') {
          data.strengthPrescription = Prisma.DbNull;
        }

        const s = await updatePlannedSession(input.id, data);

        try {
          await refreshAndPersistPlannedSessionContext(s.id);
        } catch (error) {
          console.error('[coach/updatePlannedSession/context]', error);
        }

        pushSessionToGoogleInBackground(s);

        return {
          ok: true,
          id: s.id,
          action: 'updated' as const,
          date: format(s.date, 'yyyy-MM-dd'),
          startTime: s.startTime,
          type: s.type,
          title: s.title,
        };
      } catch (error) {
        console.error('[coach] updatePlannedSession', error);
        const detail = error instanceof Error ? error.message : String(error);
        return {
          ok: false as const,
          error: `Impossible de modifier la séance : ${detail}`,
        };
      }
    },
  }),

  deletePlannedSession: tool({
    description: 'Supprime une séance planifiée (identifiée par son id).',
    inputSchema: z.object({
      id: z.string().describe('id de la séance (via listPlannedSessions).'),
    }),
    execute: async ({ id }) => {
      const existing = await getPlannedSessionById(id);
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

      await deletePlannedSession(id);
      return {
        ok: true,
        id,
        action: 'deleted' as const,
        title: existing.title,
        date: format(existing.date, 'yyyy-MM-dd'),
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
        const travel = await createTravelContext(prisma, {
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
            : await applyTravelContextToUpcomingSessions(prisma, travel.id);
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
          error: error instanceof Error ? error.message : 'Impossible de créer le contexte voyage',
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
        const constraint = await createTravelContext(prisma, {
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
      const account = await getGoogleAccount();
      if (!account) {
        return { connected: false as const, busy: [] };
      }
      try {
        const busy = await getUpcomingBusy(days);
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

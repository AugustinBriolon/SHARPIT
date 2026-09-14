import { tool } from 'ai';
import { z } from 'zod';
import type { PracticedSportId } from '@/lib/practiced-sports';
import {
  coachToolFailure,
  coachTypeEnumForSports,
  endurancePrescriptionToolSchema,
  exposureEnum,
  intensityEnum,
  rejectIfSportNotPracticed,
  startTimeSchema,
  strengthPrescriptionToolSchema,
} from './coach-tools-shared';
import {
  executeCreateBrickSessionTool,
  executeCreatePlannedSessionTool,
  executeDeletePlannedSessionTool,
  executeUpdatePlannedSessionTool,
} from './coach-tools-executors';

function buildCreatePlannedSessionTool(
  athleteId: string,
  practicedSports: readonly PracticedSportId[],
  proposalTypeEnum: ReturnType<typeof coachTypeEnumForSports>,
) {
  return tool({
    description:
      'Crée UNE séance planifiée pour UN SEUL sport. Ne pas utiliser pour un enchaînement multisport (vélo+course, etc.) : utilise createBrickSession à la place.',
    inputSchema: z.object({
      date: z.string().describe('Date au format yyyy-MM-dd.'),
      startTime: startTimeSchema,
      type: proposalTypeEnum,
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
      const rejected = rejectIfSportNotPracticed(input.type, practicedSports);
      if (rejected) {
        return rejected;
      }
      try {
        return await executeCreatePlannedSessionTool(athleteId, input);
      } catch (error) {
        console.error('[coach] createPlannedSession', error);
        return coachToolFailure("Impossible d'ajouter la séance", error);
      }
    },
  });
}

function buildCreateBrickSessionTool(
  athleteId: string,
  practicedSports: readonly PracticedSportId[],
  proposalTypeEnum: ReturnType<typeof coachTypeEnumForSports>,
) {
  return tool({
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
            type: proposalTypeEnum,
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
      for (const leg of input.legs) {
        const rejected = rejectIfSportNotPracticed(leg.type, practicedSports);
        if (rejected) {
          return rejected;
        }
      }
      try {
        return await executeCreateBrickSessionTool(athleteId, input);
      } catch (error) {
        console.error('[coach] createBrickSession', error);
        return coachToolFailure('Impossible de créer le brick', error);
      }
    },
  });
}

function buildUpdatePlannedSessionTool(
  athleteId: string,
  practicedSports: readonly PracticedSportId[],
  proposalTypeEnum: ReturnType<typeof coachTypeEnumForSports>,
) {
  return tool({
    description:
      'Modifie une séance planifiée existante (identifiée par son id). Ne renseigne que les champs à changer.',
    inputSchema: z.object({
      id: z
        .string()
        .describe('id de la séance (contexte « Déjà planifié » ou listPlannedSessions).'),
      date: z.string().optional().describe('Nouvelle date yyyy-MM-dd.'),
      startTime: startTimeSchema,
      type: proposalTypeEnum.optional(),
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
      if (input.type) {
        const rejected = rejectIfSportNotPracticed(input.type, practicedSports);
        if (rejected) {
          return rejected;
        }
      }
      try {
        return await executeUpdatePlannedSessionTool(athleteId, input);
      } catch (error) {
        console.error('[coach] updatePlannedSession', error);
        return coachToolFailure('Impossible de modifier la séance', error);
      }
    },
  });
}

function buildDeletePlannedSessionTool(athleteId: string) {
  return tool({
    description: 'Supprime une séance planifiée (identifiée par son id).',
    inputSchema: z.object({
      id: z
        .string()
        .describe('id de la séance (contexte « Déjà planifié » ou listPlannedSessions).'),
    }),
    execute: async ({ id }) => executeDeletePlannedSessionTool(athleteId, id),
  });
}

export function buildSessionCoachTools(
  athleteId: string,
  practicedSports: readonly PracticedSportId[],
  proposalTypeEnum: ReturnType<typeof coachTypeEnumForSports>,
) {
  return {
    createPlannedSession: buildCreatePlannedSessionTool(
      athleteId,
      practicedSports,
      proposalTypeEnum,
    ),
    createBrickSession: buildCreateBrickSessionTool(athleteId, practicedSports, proposalTypeEnum),
    updatePlannedSession: buildUpdatePlannedSessionTool(
      athleteId,
      practicedSports,
      proposalTypeEnum,
    ),
    deletePlannedSession: buildDeletePlannedSessionTool(athleteId),
  };
}

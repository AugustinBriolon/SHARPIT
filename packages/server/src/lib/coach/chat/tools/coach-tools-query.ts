import { tool } from 'ai';
import { addDays, startOfDay } from 'date-fns';
import { z } from 'zod';
import {
  getGoogleAccount,
  getUpcomingBusy,
} from '@sharpit/server/lib/integrations/google/google-sync';
import { getPlannedSessions } from '@sharpit/server/lib/queries';
import { dayKeyFromDate } from '@sharpit/app/lib/date/day-key';
import { suggestGarminTaxonomy } from '@sharpit/app/lib/integrations/garmin/garmin-exercise-taxonomy';
import {
  formatScenarioComparisonForCoach,
  loadScenarioComparisonForCoach,
} from '@sharpit/server/lib/presentation/scenario/scenario-comparison';
import { parseStrengthPrescription } from '@sharpit/app/lib/planned-session/strength/strength-prescription';

function buildListPlannedSessionsTool(athleteId: string) {
  return tool({
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
  });
}

function buildGetScenarioProjectionTool(athleteId: string) {
  return tool({
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
  });
}

function buildSearchWatchExercisesTool() {
  return tool({
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
  });
}

function buildGetCalendarAvailabilityTool(athleteId: string) {
  return tool({
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
  });
}

export function buildQueryCoachTools(athleteId: string) {
  return {
    listPlannedSessions: buildListPlannedSessionsTool(athleteId),
    getScenarioProjection: buildGetScenarioProjectionTool(athleteId),
    searchWatchExercises: buildSearchWatchExercisesTool(),
    getCalendarAvailability: buildGetCalendarAvailabilityTool(athleteId),
  };
}

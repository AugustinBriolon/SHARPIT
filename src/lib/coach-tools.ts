import type { Prisma } from "@prisma/client";
import { tool } from "ai";
import { addDays, format, startOfDay } from "date-fns";
import { z } from "zod";
import {
  createPlannedSession,
  deletePlannedSession,
  getPlannedSessionById,
  getPlannedSessions,
  updatePlannedSession,
} from "./queries";

const typeEnum = z.enum(["RUN", "BIKE", "SWIM", "STRENGTH"]);
const intensityEnum = z.enum([
  "RECOVERY",
  "ENDURANCE",
  "TEMPO",
  "THRESHOLD",
  "VO2MAX",
  "RACE",
]);

const toDate = (d: string) => new Date(`${d}T12:00:00`);

/**
 * Outils donnés au Coach IA pour agir directement sur les séances planifiées.
 * Tous s'exécutent côté serveur et renvoient un résumé compact.
 */
export const coachTools = {
  listPlannedSessions: tool({
    description:
      "Liste les séances planifiées à venir avec leur id, pour pouvoir les modifier ou supprimer. À appeler avant toute modification/suppression pour récupérer les bons id.",
    inputSchema: z.object({
      days: z
        .number()
        .int()
        .min(1)
        .max(60)
        .optional()
        .describe("Horizon en jours (défaut 21)."),
    }),
    execute: async ({ days = 21 }) => {
      const today = startOfDay(new Date());
      const sessions = await getPlannedSessions({
        from: today,
        to: addDays(today, days),
      });
      return sessions.map((s) => ({
        id: s.id,
        date: format(s.date, "yyyy-MM-dd"),
        type: s.type,
        intensity: s.intensity,
        title: s.title,
        durationMin: s.durationMin,
        load: s.load,
        completed: s.completed,
      }));
    },
  }),

  createPlannedSession: tool({
    description:
      "Crée une nouvelle séance planifiée dans le calendrier de l'athlète.",
    inputSchema: z.object({
      date: z.string().describe("Date au format yyyy-MM-dd."),
      type: typeEnum,
      intensity: intensityEnum.optional(),
      title: z.string().describe("Titre court de la séance."),
      description: z
        .string()
        .optional()
        .describe("Structure détaillée (échauffement, corps, récup)."),
      durationMin: z.number().int().min(5).max(420).optional(),
      load: z.number().int().min(0).max(400).optional().describe("TSS estimé."),
    }),
    execute: async (input) => {
      const s = await createPlannedSession({
        type: input.type,
        date: toDate(input.date),
        title: input.title,
        description: input.description ?? null,
        durationMin: input.durationMin ?? null,
        load: input.load ?? null,
        intensity: input.intensity ?? null,
      });
      return {
        ok: true,
        id: s.id,
        action: "created" as const,
        date: input.date,
        type: input.type,
        title: input.title,
      };
    },
  }),

  updatePlannedSession: tool({
    description:
      "Modifie une séance planifiée existante (identifiée par son id). Ne renseigne que les champs à changer.",
    inputSchema: z.object({
      id: z.string().describe("id de la séance (via listPlannedSessions)."),
      date: z.string().optional().describe("Nouvelle date yyyy-MM-dd."),
      type: typeEnum.optional(),
      intensity: intensityEnum.optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      durationMin: z.number().int().min(5).max(420).optional(),
      load: z.number().int().min(0).max(400).optional(),
    }),
    execute: async (input) => {
      const existing = await getPlannedSessionById(input.id);
      if (!existing) {
        return { ok: false as const, error: "Séance introuvable" };
      }
      const data: Prisma.PlannedSessionUncheckedUpdateInput = {};
      if (input.date) data.date = toDate(input.date);
      if (input.type) data.type = input.type;
      if (input.intensity) data.intensity = input.intensity;
      if (input.title !== undefined) data.title = input.title;
      if (input.description !== undefined) data.description = input.description;
      if (input.durationMin !== undefined) data.durationMin = input.durationMin;
      if (input.load !== undefined) data.load = input.load;

      const s = await updatePlannedSession(input.id, data);
      return {
        ok: true,
        id: s.id,
        action: "updated" as const,
        date: format(s.date, "yyyy-MM-dd"),
        type: s.type,
        title: s.title,
      };
    },
  }),

  deletePlannedSession: tool({
    description: "Supprime une séance planifiée (identifiée par son id).",
    inputSchema: z.object({
      id: z.string().describe("id de la séance (via listPlannedSessions)."),
    }),
    execute: async ({ id }) => {
      const existing = await getPlannedSessionById(id);
      if (!existing) {
        return { ok: false as const, error: "Séance introuvable" };
      }
      await deletePlannedSession(id);
      return {
        ok: true,
        id,
        action: "deleted" as const,
        title: existing.title,
        date: format(existing.date, "yyyy-MM-dd"),
      };
    },
  }),
};

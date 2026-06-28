import { z } from "zod";

/** Schéma de sortie structurée du générateur de séances. */
export const coachPlanSchema = z.object({
  summary: z
    .string()
    .describe(
      "Résumé en 1-2 phrases de la logique du bloc proposé (phase, intention, ajustement selon la fraîcheur).",
    ),
  sessions: z
    .array(
      z.object({
        dayOffset: z
          .number()
          .int()
          .min(0)
          .max(27)
          .describe("Nombre de jours après la date de début du plan (0 = jour de début)."),
        type: z.enum(["RUN", "BIKE", "SWIM", "STRENGTH"]),
        intensity: z.enum([
          "RECOVERY",
          "ENDURANCE",
          "TEMPO",
          "THRESHOLD",
          "VO2MAX",
          "RACE",
        ]),
        title: z.string().describe("Titre court de la séance."),
        description: z
          .string()
          .describe(
            "Structure détaillée : échauffement, corps de séance (intervalles, allures/zones cibles), récupération.",
          ),
        durationMin: z.number().int().min(10).max(420),
        load: z
          .number()
          .int()
          .min(0)
          .max(400)
          .describe("Charge / TSS estimé de la séance."),
        rationale: z
          .string()
          .describe("Justification courte : pourquoi cette séance maintenant."),
      }),
    )
    .min(1)
    .max(14),
});

export type CoachPlan = z.infer<typeof coachPlanSchema>;

/** Paramètres de la requête de génération. */
export const coachPlanRequestSchema = z.object({
  startDate: z.coerce.date().optional(),
  days: z.coerce.number().int().min(1).max(28).optional(),
  focus: z.string().optional().nullable(),
});

/** Analyse d'une séance réalisée vs prévue. */
export const sessionAnalysisSchema = z.object({
  complianceScore: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Score de conformité 0-100 entre le prévu et le réalisé."),
  verdict: z
    .enum([
      "AS_PLANNED",
      "HARDER",
      "EASIER",
      "SHORTER",
      "LONGER",
      "DIFFERENT",
    ])
    .describe(
      "Verdict global : conforme, plus dur, plus facile, plus court, plus long, ou différent.",
    ),
  summary: z.string().describe("Résumé en 1-2 phrases de la réalisation."),
  remarks: z
    .array(z.string())
    .max(5)
    .describe("Remarques pertinentes et exploitables (3 max idéalement)."),
  recommendation: z
    .string()
    .describe("Conseil concret à retenir pour la suite."),
});

export type SessionAnalysis = z.infer<typeof sessionAnalysisSchema>;

/** Réadaptation des séances à venir. */
export const adaptPlanSchema = z.object({
  summary: z
    .string()
    .describe("Synthèse des ajustements proposés et de leur logique."),
  changes: z
    .array(
      z.object({
        action: z.enum(["MODIFY", "REMOVE", "ADD"]),
        sessionId: z
          .string()
          .nullable()
          .describe("ID de la séance existante (pour MODIFY/REMOVE), null pour ADD."),
        date: z
          .string()
          .nullable()
          .describe("Date yyyy-MM-dd (requise pour ADD)."),
        type: z.enum(["RUN", "BIKE", "SWIM", "STRENGTH"]).nullable(),
        intensity: z
          .enum([
            "RECOVERY",
            "ENDURANCE",
            "TEMPO",
            "THRESHOLD",
            "VO2MAX",
            "RACE",
          ])
          .nullable(),
        title: z.string().nullable(),
        description: z.string().nullable(),
        durationMin: z.number().int().nullable(),
        load: z.number().int().nullable(),
        reason: z.string().describe("Pourquoi cet ajustement."),
      }),
    )
    .max(20),
});

export type AdaptPlan = z.infer<typeof adaptPlanSchema>;

export const adaptRequestSchema = z.object({
  days: z.coerce.number().int().min(1).max(28).optional(),
  focus: z.string().optional().nullable(),
});

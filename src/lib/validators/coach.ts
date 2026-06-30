import { z } from 'zod';

/** Schéma de sortie structurée du générateur de séances. */
export const coachPlanSchema = z.object({
  summary: z
    .string()
    .describe(
      'Résumé en 1-2 phrases de la logique du bloc proposé (phase, intention, ajustement selon la fraîcheur).',
    ),
  sessions: z
    .array(
      z.object({
        dayOffset: z
          .number()
          .int()
          .min(0)
          .max(27)
          .describe('Nombre de jours après la date de début du plan (0 = jour de début).'),
        startTime: z
          .string()
          .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
          .nullable()
          .describe(
            "Heure de début 'HH:mm' choisie dans un créneau LIBRE de l'agenda (entre 06:00 et 21:00, jamais la nuit). null si aucune contrainte d'agenda.",
          ),
        type: z.enum(['RUN', 'BIKE', 'SWIM', 'STRENGTH']),
        intensity: z.enum(['RECOVERY', 'ENDURANCE', 'TEMPO', 'THRESHOLD', 'VO2MAX', 'RACE']),
        title: z.string().describe('Titre court de la séance.'),
        description: z
          .string()
          .describe(
            'Structure détaillée : échauffement, corps de séance (intervalles, allures/zones cibles), récupération.',
          ),
        durationMin: z.number().int().min(10).max(420),
        load: z.number().int().min(0).max(400).describe('Charge / TSS estimé de la séance.'),
        rationale: z.string().describe('Justification courte : pourquoi cette séance maintenant.'),
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
  goalId: z.string().optional().nullable(),
  targetLoad: z.coerce.number().int().min(0).max(1200).optional().nullable(),
  planPhase: z.string().optional().nullable(),
  planFocus: z.string().optional().nullable(),
});

/** Analyse d'une séance réalisée vs prévue. */
export const sessionAnalysisSchema = z.object({
  complianceScore: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe('Score de conformité 0-100 entre le prévu et le réalisé.'),
  verdict: z
    .enum(['AS_PLANNED', 'HARDER', 'EASIER', 'SHORTER', 'LONGER', 'DIFFERENT'])
    .describe(
      'Verdict global : conforme, plus dur, plus facile, plus court, plus long, ou différent.',
    ),
  summary: z.string().describe('Résumé en 1-2 phrases de la réalisation.'),
  remarks: z
    .array(z.string())
    .max(5)
    .describe('Remarques pertinentes et exploitables (3 max idéalement).'),
  recommendation: z.string().describe('Conseil concret à retenir pour la suite.'),
  physicalReassessments: z
    .array(
      z.object({
        noteId: z
          .string()
          .describe(
            "ID EXACT d'une douleur/blessure ACTIVE fournie dans le contexte. N'invente jamais d'ID : recopie-le tel quel.",
          ),
        noteTitle: z.string().describe("Titre de la note physique concernée (pour l'affichage)."),
        question: z
          .string()
          .describe(
            "Question courte et ciblée à poser à l'athlète pour réévaluer cette douleur après cette séance.",
          ),
        suggestedSeverity: z
          .number()
          .int()
          .min(0)
          .max(10)
          .nullable()
          .describe(
            "Sévérité 0-10 suggérée UNIQUEMENT si l'athlète l'a explicitement indiquée dans ses notes/ressenti. Sinon null (l'athlète renseignera lui-même).",
          ),
        comment: z
          .string()
          .describe(
            'Commentaire pré-rempli pour le point de suivi, rappelant le contexte de la séance (ex. test diagnostique réalisé).',
          ),
      }),
    )
    .max(3)
    .optional()
    .describe(
      'Propositions de réévaluation du suivi physique, UNIQUEMENT pour les douleurs/blessures actives dont la zone est explicitement sollicitée ou mentionnée par la consigne / les notes de cette séance. Laisse vide ou omets si rien de pertinent.',
    ),
});

export type SessionAnalysis = z.infer<typeof sessionAnalysisSchema>;

/** Analyse GLOBALE d'un brick (enchaînement multisport). */
export const brickAnalysisSchema = z.object({
  overallScore: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe("Score global d'exécution du brick 0-100 (transitions incluses)."),
  summary: z.string().describe('Synthèse globale du brick en 1-2 phrases.'),
  transition: z
    .string()
    .describe(
      "Analyse de l'enchaînement / des transitions : dérive cardiaque, perte d'allure en sortie de vélo, sensations dans les premières minutes du sport suivant.",
    ),
  remarks: z.array(z.string()).max(5).describe("Remarques exploitables sur l'ensemble du brick."),
  recommendation: z.string().describe('Conseil concret pour améliorer les prochains bricks.'),
});

export type BrickAnalysis = z.infer<typeof brickAnalysisSchema>;

/** Réadaptation des séances à venir. */
const nullableAdaptString = z.preprocess(
  (v) => (v === '' || v === 'null' ? null : v),
  z.string().nullable(),
);

const nullableAdaptInt = z.preprocess((v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}, z.number().int().nullable());

const adaptChangeBase = {
  action: z.enum(['MODIFY', 'REMOVE', 'ADD']),
  sessionId: z
    .string()
    .nullable()
    .describe('ID de la séance existante (pour MODIFY/REMOVE), null pour ADD.'),
  date: z.string().nullable().describe('Date yyyy-MM-dd (requise pour ADD).'),
  type: z.enum(['RUN', 'BIKE', 'SWIM', 'STRENGTH']).nullable(),
  intensity: z.enum(['RECOVERY', 'ENDURANCE', 'TEMPO', 'THRESHOLD', 'VO2MAX', 'RACE']).nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  durationMin: z.number().nullable().describe('Durée en minutes (entier).'),
  load: z.number().nullable().describe('Charge TSS (entier).'),
  reason: z.string().describe('Pourquoi cet ajustement.'),
};

/** Schéma permissif pour la génération IA (accepte les décimales). */
export const adaptPlanGenerationSchema = z.object({
  summary: z.string().describe('Synthèse des ajustements proposés et de leur logique.'),
  changes: z.array(z.object(adaptChangeBase)).max(20),
});

export const adaptPlanSchema = z.object({
  summary: z.string().describe('Synthèse des ajustements proposés et de leur logique.'),
  changes: z
    .array(
      z.object({
        action: adaptChangeBase.action,
        sessionId: z.preprocess(
          (v) => (v === '' || v === 'null' ? null : v),
          adaptChangeBase.sessionId,
        ),
        date: nullableAdaptString.describe('Date yyyy-MM-dd (requise pour ADD).'),
        type: adaptChangeBase.type,
        intensity: adaptChangeBase.intensity,
        title: nullableAdaptString,
        description: nullableAdaptString,
        durationMin: nullableAdaptInt,
        load: nullableAdaptInt,
        reason: adaptChangeBase.reason,
      }),
    )
    .max(20),
});

export type AdaptPlan = z.infer<typeof adaptPlanSchema>;

export const adaptRequestSchema = z.object({
  days: z.coerce.number().int().min(1).max(28).optional(),
  focus: z.string().optional().nullable(),
});

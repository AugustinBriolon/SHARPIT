import { z } from 'zod';

/** One planned strength movement (aggregated sets, same shape as realized StrengthSet). */
export const strengthPrescriptionSetSchema = z.object({
  exercise: z.string().trim().min(1).max(120),
  exerciseCatalogId: z.string().trim().min(1).max(32).optional().nullable(),
  sets: z.coerce.number().int().min(1).max(50),
  reps: z.coerce.number().int().min(0).max(500),
  durationSec: z.coerce.number().int().min(0).max(3600).optional().nullable(),
  weightKg: z.coerce.number().min(0).max(1000).optional().nullable(),
  restSec: z.coerce.number().int().min(0).max(3600).optional().nullable(),
  notes: z.string().trim().max(240).optional().nullable(),
  order: z.coerce.number().int().min(0).max(200),
});

export const strengthPrescriptionSchema = z.object({
  version: z.literal(1),
  sets: z.array(strengthPrescriptionSetSchema).max(40),
});

export type StrengthPrescriptionSet = z.infer<typeof strengthPrescriptionSetSchema>;
export type StrengthPrescription = z.infer<typeof strengthPrescriptionSchema>;

/**
 * LLM-facing set shape (no version/order — assigned on normalize).
 * Used by coach plan, adapt, and chat tools.
 */
export const coachStrengthSetSchema = z.object({
  exercise: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .describe('Nom FR de l’exercice (ex. Pompe, Squat barre, Planche).'),
  sets: z.number().int().min(1).max(20).describe('Nombre de séries.'),
  reps: z
    .number()
    .int()
    .min(0)
    .max(100)
    .describe('Répétitions par série. 0 si isométrie chronométrée (planche…).'),
  durationSec: z
    .number()
    .int()
    .min(0)
    .max(3600)
    .nullable()
    .optional()
    .describe('Durée d’une série en secondes (isométrie). null sinon.'),
  weightKg: z
    .number()
    .min(0)
    .max(500)
    .nullable()
    .optional()
    .describe('Charge cible en kg si pertinente, sinon null.'),
  restSec: z
    .number()
    .int()
    .min(0)
    .max(600)
    .nullable()
    .optional()
    .describe('Repos entre séries en secondes (souvent 60–120).'),
  notes: z.string().trim().max(240).nullable().optional().describe('Consigne courte optionnelle.'),
});

export const coachStrengthPrescriptionSchema = z
  .object({
    sets: z
      .array(coachStrengthSetSchema)
      .min(1)
      .max(20)
      .describe('Liste ordonnée des exercices de la séance muscu.'),
  })
  .describe(
    'Prescription muscu structurée (montre Garmin). OBLIGATOIRE si type=STRENGTH, null sinon.',
  );

export type CoachStrengthPrescription = z.infer<typeof coachStrengthPrescriptionSchema>;

export function emptyStrengthPrescription(): StrengthPrescription {
  return { version: 1, sets: [] };
}

/** Soft-parse Json from DB — invalid / empty → null. */
export function parseStrengthPrescription(raw: unknown): StrengthPrescription | null {
  if (raw == null) return null;
  const parsed = strengthPrescriptionSchema.safeParse(raw);
  if (!parsed.success) return null;
  if (parsed.data.sets.length === 0) return null;
  return parsed.data;
}

/** Normalize coach/LLM payload → persisted StrengthPrescription. */
export function normalizeCoachStrengthPrescription(
  raw: CoachStrengthPrescription | StrengthPrescription | null | undefined,
): StrengthPrescription | null {
  if (raw == null) return null;

  if ('version' in raw && raw.version === 1) {
    return parseStrengthPrescription(raw);
  }

  const sets = raw.sets
    .map((set, order) => {
      const exercise = set.exercise?.trim();
      if (!exercise) return null;
      return {
        exercise,
        exerciseCatalogId: null,
        sets: set.sets,
        reps: set.reps,
        durationSec: set.durationSec ?? null,
        weightKg: set.weightKg ?? null,
        restSec: set.restSec ?? 90,
        notes: set.notes ?? null,
        order,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s != null);

  return parseStrengthPrescription({ version: 1, sets });
}

/**
 * For STRENGTH sessions: keep/normalize prescription and fill empty description.
 * For other sports: clear prescription.
 */
export function resolveStrengthFieldsForPersist(input: {
  type: string;
  description?: string | null;
  strengthPrescription?: CoachStrengthPrescription | StrengthPrescription | null;
}): {
  strengthPrescription: StrengthPrescription | null;
  description: string | null;
} {
  if (input.type !== 'STRENGTH') {
    return {
      strengthPrescription: null,
      description: input.description?.trim() || null,
    };
  }

  const prescription = normalizeCoachStrengthPrescription(input.strengthPrescription);
  const description =
    input.description?.trim() ||
    (prescription ? formatStrengthPrescriptionSummary(prescription) : null);

  return { strengthPrescription: prescription, description };
}

/** Human summary for description / Google Calendar when athlete left description empty. */
export function formatStrengthPrescriptionSummary(prescription: StrengthPrescription): string {
  return prescription.sets
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((set) => {
      const volume =
        set.durationSec && set.durationSec > 0 && set.reps <= 0
          ? `${set.sets}×${set.durationSec}s`
          : `${set.sets}×${set.reps}`;
      const weight = set.weightKg != null && set.weightKg > 0 ? ` @ ${set.weightKg}kg` : '';
      return `${set.exercise} ${volume}${weight}`;
    })
    .join(' · ');
}

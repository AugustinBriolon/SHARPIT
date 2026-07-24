import { z } from 'zod';
import { resolveGarminExerciseMatch } from '@/lib/integrations/garmin-exercise-map';

/** Resolved Garmin Connect identity persisted with the prescription set. */
export const strengthPrescriptionGarminSchema = z.object({
  category: z.string().trim().min(1).max(64),
  exerciseName: z.string().trim().min(1).max(96),
  labelFr: z.string().trim().min(1).max(160).optional().nullable(),
  confidence: z.enum(['exact', 'alias', 'fuzzy']),
});

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
  garmin: strengthPrescriptionGarminSchema.optional().nullable(),
});

export const strengthPrescriptionSchema = z.object({
  version: z.literal(1),
  sets: z.array(strengthPrescriptionSetSchema).max(40),
});

export type StrengthPrescriptionSet = z.infer<typeof strengthPrescriptionSetSchema>;
export type StrengthPrescription = z.infer<typeof strengthPrescriptionSchema>;
export type StrengthPrescriptionGarmin = z.infer<typeof strengthPrescriptionGarminSchema>;

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
    .describe(
      'Nom FR de l’exercice. Préférer un libellé proche du catalogue Garmin Connect (ex. Pompe, Étirement 90/90, Clamshell avec élastique).',
    ),
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

/** Attach / refresh Garmin Connect refs on each set (sync, bundled taxonomy). */
export function attachGarminRefsToPrescription(
  prescription: StrengthPrescription,
): StrengthPrescription {
  return {
    ...prescription,
    sets: prescription.sets.map((set) => {
      const match = resolveGarminExerciseMatch({
        exercise: set.exercise,
        exerciseCatalogId: set.exerciseCatalogId,
      });
      if (!match) return { ...set, garmin: null };
      return {
        ...set,
        garmin: {
          category: match.ref.category,
          exerciseName: match.ref.exerciseName,
          labelFr: match.labelFr,
          confidence: match.confidence,
        },
      };
    }),
  };
}

/** Watch-compat summary for UI. */
export function strengthSetWatchCompat(set: Pick<StrengthPrescriptionSet, 'garmin'>): {
  status: 'ready' | 'approx' | 'unknown';
  label: string;
} {
  if (!set.garmin) {
    return { status: 'unknown', label: 'Hors catalogue montre' };
  }
  const name = set.garmin.labelFr?.trim() || set.garmin.exerciseName;
  if (set.garmin.confidence === 'fuzzy') {
    return { status: 'approx', label: `Approx. · ${name}` };
  }
  return { status: 'ready', label: `Montre · ${name}` };
}

/** Normalize coach/LLM payload → persisted StrengthPrescription (+ Garmin refs). */
export function normalizeCoachStrengthPrescription(
  raw: CoachStrengthPrescription | StrengthPrescription | null | undefined,
): StrengthPrescription | null {
  if (raw == null) return null;

  if ('version' in raw && raw.version === 1) {
    const parsed = parseStrengthPrescription(raw);
    return parsed ? attachGarminRefsToPrescription(parsed) : null;
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
        garmin: null,
      };
    })
    .filter((s): s is NonNullable<typeof s> => s != null);

  const parsed = parseStrengthPrescription({ version: 1, sets });
  return parsed ? attachGarminRefsToPrescription(parsed) : null;
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

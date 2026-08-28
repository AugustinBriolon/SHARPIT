/**
 * Movement taxonomy — the biomechanical layer the strength capability model reads.
 *
 * [lexicon.ts] and [resolve.ts] answer "which catalog row is this label?" — a naming
 * question. This file answers "what does this movement DO?", which is what decides
 * whether a load can be estimated for it at all, and against which capability it is
 * estimated.
 *
 * Two axes, deliberately separate:
 * - `intent` — what the movement trains. Gates whether a load model applies.
 * - `pattern` — the biomechanical family carrying the athlete's latent strength.
 *
 * Keeping them apart is what lets a jump squat share `SQUAT` with a back squat
 * (same family, useful for prescription) while contributing nothing to its
 * one-rep-max estimate (`centrality: 0`).
 */
import taxonomyJson from '@/data/movement-taxonomy.json';
import { EXERCISE_ALIASES } from '@/lib/exercises/aliases';
import { normalizeExerciseKey } from '@/lib/exercises/normalize';
import { getExerciseMediaByCatalogId } from '@/lib/exercises/resolve';
import { z } from 'zod';

/** What the movement trains — decides whether a load model applies at all. */
export const movementIntentSchema = z.enum([
  'STRENGTH',
  'CORE',
  'PLYOMETRIC',
  'MOBILITY',
  'CONDITIONING',
]);
export type MovementIntent = z.infer<typeof movementIntentSchema>;

/**
 * How resistance is applied — decides how a target intensity becomes a prescription.
 *
 * - EXTERNAL_ABSOLUTE — barbell, dumbbell: kg is the whole load
 * - BODYWEIGHT_LOADABLE — pull-up, dips, push-up: bodyweight × leverage, plus optional added kg
 * - BODYWEIGHT_FIXED — plank, jump squat: progressed by reps or time, never by kg
 * - ASSISTED — band or machine assistance: the added term is negative
 * - BAND — tension tier, not kilograms
 * - MACHINE_STACK — machine-specific units, not comparable across gyms
 * - NONE — no load axis (mobility)
 */
export const loadModalitySchema = z.enum([
  'EXTERNAL_ABSOLUTE',
  'BODYWEIGHT_LOADABLE',
  'BODYWEIGHT_FIXED',
  'ASSISTED',
  'BAND',
  'MACHINE_STACK',
  'NONE',
]);
export type LoadModality = z.infer<typeof loadModalitySchema>;

/** Latent capability bucket — one estimated strength scalar per pattern, per athlete. */
export const movementPatternSchema = z.enum([
  'SQUAT',
  'SQUAT_UNILATERAL',
  'HINGE',
  'HINGE_UNILATERAL',
  'HIP_EXTENSION',
  'HIP_ABDUCTION',
  'HORIZONTAL_PUSH',
  'VERTICAL_PUSH',
  'HORIZONTAL_PULL',
  'VERTICAL_PULL',
  'CALF_RAISE',
  'ELBOW_FLEXION',
  'ELBOW_EXTENSION',
  'SHOULDER_ABDUCTION',
  'CARRY',
  'CORE_ANTI_EXTENSION',
  'CORE_ANTI_ROTATION',
  'CORE_ANTI_LATERAL',
  'CORE_FLEXION',
  'CORE_ROTATION',
]);
export type MovementPattern = z.infer<typeof movementPatternSchema>;

/** Modalities whose resolved load includes a bodyweight term. */
const BODYWEIGHT_MODALITIES: ReadonlySet<LoadModality> = new Set<LoadModality>([
  'BODYWEIGHT_LOADABLE',
  'BODYWEIGHT_FIXED',
  'ASSISTED',
]);

type TaxonomyValidationEntry = {
  id: string;
  intent: z.infer<typeof movementIntentSchema>;
  pattern: z.infer<typeof movementPatternSchema> | null;
  modality: LoadModality;
  centrality: number;
  leverageFactor: number | null;
};

function validateMobilityEntry(
  entry: TaxonomyValidationEntry,
  fail: (message: string) => void,
): void {
  if (entry.intent === 'MOBILITY' && ((entry.pattern !== undefined && entry.pattern !== null) || entry.modality !== 'NONE')) {
    fail(`${entry.id}: mobility carries no pattern and no load axis`);
  }
}

function validatePatternEntry(
  entry: TaxonomyValidationEntry,
  fail: (message: string) => void,
): void {
  if ((entry.pattern === undefined || entry.pattern === null) && entry.intent !== 'MOBILITY' && entry.intent !== 'CONDITIONING') {
    fail(`${entry.id}: only mobility and conditioning may have no pattern`);
  }
}

function validateCentralityEntry(
  entry: TaxonomyValidationEntry,
  fail: (message: string) => void,
): void {
  if (entry.centrality > 0 && entry.intent !== 'STRENGTH') {
    fail(`${entry.id}: centrality must be 0 outside STRENGTH intent`);
  }
}

function validateLeverageEntry(
  entry: TaxonomyValidationEntry,
  fail: (message: string) => void,
): void {
  const needsLeverage = BODYWEIGHT_MODALITIES.has(entry.modality);
  if (needsLeverage && (entry.leverageFactor === undefined || entry.leverageFactor === null)) {
    fail(`${entry.id}: ${entry.modality} requires a leverageFactor`);
  }
  if (!needsLeverage && (entry.leverageFactor !== undefined && entry.leverageFactor !== null)) {
    fail(`${entry.id}: ${entry.modality} carries no bodyweight term`);
  }
}

const movementTaxonomyEntrySchema = z
  .object({
    id: z.string().trim().min(1).max(64),
    /** Labels seen in the wild (FR athlete, FR/EN Garmin). Matched normalized. */
    labels: z.array(z.string().trim().min(1)).min(1),
    pattern: movementPatternSchema.nullable(),
    intent: movementIntentSchema,
    modality: loadModalitySchema,
    /** Fraction of bodyweight the movement actually lifts. Null when no bodyweight term. */
    leverageFactor: z.number().min(0).max(1.2).nullable(),
    /** Weight this movement carries when updating its pattern's strength scalar. */
    centrality: z.number().min(0).max(1),
    unilateral: z.boolean(),
    /** Technique-limited (olympic lifts) — never receives a transferred estimate. */
    skillLimited: z.boolean(),
  })
  .superRefine((entry, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
    validateMobilityEntry(entry, fail);
    validatePatternEntry(entry, fail);
    validateCentralityEntry(entry, fail);
    validateLeverageEntry(entry, fail);
  });

export type MovementTaxonomyEntry = z.infer<typeof movementTaxonomyEntrySchema>;

const movementTaxonomyFileSchema = z.object({
  version: z.literal(1),
  entries: z.array(movementTaxonomyEntrySchema).min(1),
});

type MovementTaxonomyIndex = {
  entries: readonly MovementTaxonomyEntry[];
  byId: ReadonlyMap<string, MovementTaxonomyEntry>;
  byNormalizedLabel: ReadonlyMap<string, MovementTaxonomyEntry>;
};

let cachedIndex: MovementTaxonomyIndex | null = null;

/**
 * Parse + index the curated file. Throws on a malformed entry: a silent fallback
 * here would surface later as a load prescribed against the wrong pattern.
 */
export function movementTaxonomyIndex(): MovementTaxonomyIndex {
  if (cachedIndex) {
    return cachedIndex;
  }

  const file = movementTaxonomyFileSchema.parse(taxonomyJson);
  const byId = new Map<string, MovementTaxonomyEntry>();
  const byNormalizedLabel = new Map<string, MovementTaxonomyEntry>();

  for (const entry of file.entries) {
    if (byId.has(entry.id)) {
      throw new Error(`movement-taxonomy: duplicate id "${entry.id}"`);
    }
    byId.set(entry.id, entry);

    for (const label of entry.labels) {
      const key = normalizeExerciseKey(label);
      const clash = byNormalizedLabel.get(key);
      if (clash && clash.id !== entry.id) {
        throw new Error(
          `movement-taxonomy: label "${label}" claimed by ${clash.id} and ${entry.id}`,
        );
      }
      byNormalizedLabel.set(key, entry);
    }
  }

  cachedIndex = { entries: file.entries, byId, byNormalizedLabel };
  return cachedIndex;
}

export function movementById(id: string): MovementTaxonomyEntry | null {
  return movementTaxonomyIndex().byId.get(id) ?? null;
}

/**
 * Classify a realized or prescribed movement.
 *
 * Curated labels first; the media catalog is only a bridge to them, never a
 * source of classification — `equipment: "body weight"` cannot tell a plank
 * from a pistol squat.
 *
 * Returns null when the movement is unknown. That is a supported answer: the
 * capability model treats it as no evidence rather than guessing a pattern.
 */
export function resolveMovement(input: {
  exercise: string;
  exerciseCatalogId?: string | null;
}): MovementTaxonomyEntry | null {
  const index = movementTaxonomyIndex();

  const direct = index.byNormalizedLabel.get(normalizeExerciseKey(input.exercise));
  if (direct) {
    return direct;
  }

  const catalogId =
    input.exerciseCatalogId?.trim() || EXERCISE_ALIASES[normalizeExerciseKey(input.exercise)];
  if (!catalogId) {
    return null;
  }

  const catalogEntry = getExerciseMediaByCatalogId(catalogId);
  if (!catalogEntry) {
    return null;
  }

  return index.byNormalizedLabel.get(normalizeExerciseKey(catalogEntry.name)) ?? null;
}

/** True when a load can meaningfully be estimated and prescribed for this movement. */
export function bearsLoadAxis(entry: MovementTaxonomyEntry): boolean {
  return entry.intent === 'STRENGTH' && entry.modality !== 'NONE';
}

/** True when realized sets on this movement should update its pattern's strength scalar. */
export function informsPatternStrength(entry: MovementTaxonomyEntry): boolean {
  return entry.centrality > 0;
}

/** True when a missing estimate may be filled from siblings in the same pattern. */
export function acceptsTransferredEstimate(entry: MovementTaxonomyEntry): boolean {
  return bearsLoadAxis(entry) && !entry.skillLimited;
}

/** Movements sharing a pattern — the transfer neighbourhood, most central first. */
export function movementsInPattern(pattern: MovementPattern): readonly MovementTaxonomyEntry[] {
  return movementTaxonomyIndex()
    .entries.filter((entry) => entry.pattern === pattern)
    .sort((a, b) => b.centrality - a.centrality);
}

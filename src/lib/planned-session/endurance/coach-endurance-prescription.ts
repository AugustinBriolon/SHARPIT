/**
 * Model-facing authoring shape for structured endurance sessions (ADR-017).
 *
 * The coach describes intent — a warmup, six one-kilometre blocks at threshold,
 * two minutes of recovery — and this module turns it into the stored schema.
 * Percentages are never authored: the intensity table in `endurance-targets.ts`
 * stays the app's physiological commitment, not the model's.
 */
import type { SessionIntensity } from '@prisma/client';
import { z } from 'zod';
import {
  enduranceSportFromActivityType,
  NO_TARGET,
  STEP_MAX_SECONDS,
  STEP_MIN_SECONDS,
  swimStrokeSchema,
  type EnduranceBlock,
  type EnduranceDuration,
  type EndurancePrescription,
  type EnduranceSport,
  type EnduranceStep,
  type EnduranceStepKind,
  type SwimStroke,
} from '@/lib/planned-session/endurance/endurance-prescription';
import {
  defaultTargetForIntensity,
  intensityFromTarget,
} from '@/lib/planned-session/endurance/endurance-targets';

const effortEnum = z.enum(['RECOVERY', 'ENDURANCE', 'TEMPO', 'THRESHOLD', 'VO2MAX', 'RACE']);

const coachEnduranceStepSchema = z
  .object({
    kind: z
      .enum(['warmup', 'interval', 'recovery', 'rest', 'cooldown'])
      .describe(
        "Rôle de l'étape : warmup (échauffement), interval (bloc de travail), recovery (récup active entre blocs), rest (repos complet), cooldown (retour au calme). Dans un groupe répété, l'étape facile qui sépare deux blocs est un recovery, jamais un interval.",
      ),
    minutes: z
      .number()
      .min(0.5)
      .max(360)
      .optional()
      .describe('Durée en minutes. Renseigne minutes OU meters, jamais les deux.'),
    meters: z
      .number()
      .int()
      .min(25)
      .max(200_000)
      .optional()
      .describe('Distance en mètres (ex. 1000 pour un 1000 m). Alternative à minutes.'),
    lap: z
      .boolean()
      .optional()
      .describe("true = l'étape se termine quand l'athlète appuie sur Lap (durée libre)."),
    effort: effortEnum
      .optional()
      .describe(
        "Intensité visée pour CETTE étape. L'app en dérive la fourchette chiffrée depuis les seuils de l'athlète — n'écris jamais d'allure, de watts ni de pourcentage toi-même. Omettre sur un rest.",
      ),
    stroke: swimStrokeSchema
      .optional()
      .describe(
        'NATATION uniquement : nage de cette étape — free (crawl), back (dos), breast (brasse), fly (papillon), im (4 nages), drill (éducatif), mixed (nage au choix). Omettre hors natation.',
      ),
    notes: z
      .string()
      .max(240)
      .optional()
      .describe('Consigne technique ou sensation pour cette étape (facultatif).'),
  })
  .describe('Une étape de la séance.');

const coachEnduranceBlockSchema = z
  .object({
    times: z
      .number()
      .int()
      .min(1)
      .max(30)
      .optional()
      .describe('Nombre de répétitions du groupe. Omettre (ou 1) pour une étape simple.'),
    steps: z
      .array(coachEnduranceStepSchema)
      .min(1)
      .max(6)
      .describe('Étapes du groupe, répétées ensemble. Une seule étape si times est omis.'),
  })
  .describe('Soit une étape simple, soit un groupe répété (ex. times=6 pour 6×1000 m).');

export const coachEndurancePrescriptionSchema = z
  .object({
    blocks: z
      .array(coachEnduranceBlockSchema)
      .min(1)
      .max(30)
      .describe(
        "Déroulé ordonné de la séance : échauffement, corps de séance, retour au calme. Un seul niveau de répétition — un groupe contient des étapes, jamais d'autres groupes.",
      ),
    poolLengthM: z
      .number()
      .min(10)
      .max(100)
      .optional()
      .describe('Longueur du bassin en mètres. Natation uniquement.'),
  })
  .describe(
    "Déroulé structuré d'une séance d'endurance (montre Garmin). Pour RUN, BIKE et SWIM. Omettre pour STRENGTH.",
  );

export type CoachEndurancePrescription = z.infer<typeof coachEndurancePrescriptionSchema>;
type CoachEnduranceStep = z.infer<typeof coachEnduranceStepSchema>;
type CoachEffort = z.infer<typeof effortEnum>;

/**
 * Steps that carry no pace, power or heart-rate band at all.
 *
 * A warm-up, a recovery jog and a cool-down are defined by being easy, not by
 * holding a number, and the watch showing a range on them is noise the athlete
 * has to read past on every step. Guidance is reserved for the work.
 */
const UNGUIDED_KINDS = new Set<EnduranceStepKind>(['warmup', 'recovery', 'rest', 'cooldown']);

function clampSeconds(minutes: number): number {
  return Math.min(STEP_MAX_SECONDS, Math.max(STEP_MIN_SECONDS, Math.round(minutes * 60)));
}

function durationOf(step: CoachEnduranceStep): EnduranceDuration {
  if (step.lap) {
    return { type: 'lap' };
  }
  if ((step.meters !== undefined && step.meters !== null)) {
    return { type: 'distance', meters: step.meters };
  }
  if ((step.minutes !== undefined && step.minutes !== null)) {
    return { type: 'time', seconds: clampSeconds(step.minutes) };
  }
  // A step with no stated end is an athlete-driven one — Lap is the honest reading.
  return { type: 'lap' };
}

/** Ascending, so two steps in a group can be compared. */
const EFFORT_RANK: Record<CoachEffort, number> = {
  RECOVERY: 0,
  ENDURANCE: 1,
  TEMPO: 2,
  THRESHOLD: 3,
  RACE: 3,
  VO2MAX: 4,
};

/**
 * The easy step between two blocks is a recovery, whatever the model called it.
 *
 * `interval` at RECOVERY effort inside a repeat group is a contradiction: it
 * reaches the watch labelled as work, and it earns a policed pace band that a
 * recovery jog has no use for. Only a group holding something harder can turn a
 * step into a recovery — a set of easy repeats is not a set of recoveries.
 */
function reclassifyRecoverySteps(
  steps: CoachEnduranceStep[],
  sessionIntensity: SessionIntensity | null,
): CoachEnduranceStep[] {
  const effortOf = (step: CoachEnduranceStep) => step.effort ?? sessionIntensity ?? null;
  const ranks = steps
    .map(effortOf)
    .filter((effort): effort is CoachEffort => (effort !== undefined && effort !== null))
    .map((effort) => EFFORT_RANK[effort]);
  if (ranks.length === 0) {
    return steps;
  }

  const hardest = Math.max(...ranks);
  if (hardest <= EFFORT_RANK.RECOVERY) {
    return steps;
  }

  return steps.map((step) => {
    const effort = effortOf(step);
    if (step.kind !== 'interval' || (effort === undefined || effort === null)) {
      return step;
    }
    return EFFORT_RANK[effort] === EFFORT_RANK.RECOVERY ? { ...step, kind: 'recovery' } : step;
  });
}

function normalizeStep(
  step: CoachEnduranceStep,
  sport: EnduranceSport,
  sessionIntensity: SessionIntensity | null,
): EnduranceStep {
  const { kind } = step;
  const effort = step.effort ?? sessionIntensity;
  const target =
    UNGUIDED_KINDS.has(kind) || (effort === undefined || effort === null)
      ? NO_TARGET
      : defaultTargetForIntensity(sport, effort).target;

  return {
    kind,
    duration: durationOf(step),
    target,
    // A stroke on a run or ride would be meaningless to Connect and to the athlete.
    ...(sport === 'SWIM' && step.stroke ? { stroke: step.stroke } : {}),
    ...(step.notes?.trim() ? { notes: step.notes.trim() } : {}),
  };
}

function appendCoachBlock(
  blocks: EnduranceBlock[],
  block: CoachEndurancePrescription['blocks'][number],
  steps: EnduranceStep[],
): void {
  if (steps.length === 0) {
    return;
  }
  if ((block.times !== undefined && block.times !== null) && block.times > 1) {
    blocks.push({ kind: 'repeat', iterations: block.times, steps });
    return;
  }
  for (const step of steps) {
    blocks.push({ kind: 'step', step });
  }
}

function buildStoredPrescription(
  sport: EnduranceSport,
  blocks: EnduranceBlock[],
  poolLengthM: number | null | undefined,
): EndurancePrescription {
  return {
    version: 1,
    sport,
    ...(sport === 'SWIM' && (poolLengthM !== undefined && poolLengthM !== null) ? { poolLengthM } : {}),
    blocks: blocks.slice(0, 30),
  };
}

function processCoachBlock(
  blocks: EnduranceBlock[],
  block: CoachEndurancePrescription['blocks'][number],
  sport: EnduranceSport,
  intensity: SessionIntensity | null,
): void {
  const authored =
    (block.times !== undefined && block.times !== null) && block.times > 1
      ? reclassifyRecoverySteps(block.steps, intensity)
      : block.steps;
  const steps = authored.map((step) => normalizeStep(step, sport, intensity));
  appendCoachBlock(blocks, block, steps);
}

/**
 * Turn the coach's intent into the stored prescription, resolving each step's
 * effort into a relative band. Returns null when nothing usable was authored.
 */
export function normalizeCoachEndurancePrescription(input: {
  prescription: CoachEndurancePrescription | null | undefined;
  type: string;
  intensity?: SessionIntensity | null;
}): EndurancePrescription | null {
  const sport = enduranceSportFromActivityType(input.type);
  if (!sport || !input.prescription?.blocks?.length) {
    return null;
  }

  const intensity = input.intensity ?? null;
  const blocks: EnduranceBlock[] = [];
  for (const block of input.prescription.blocks) {
    processCoachBlock(blocks, block, sport, intensity);
  }

  if (blocks.length === 0) {
    return null;
  }

  return buildStoredPrescription(sport, blocks, input.prescription.poolLengthM);
}

const KIND_LABEL_FR: Record<EnduranceStepKind, string> = {
  warmup: 'échauffement',
  interval: 'bloc',
  recovery: 'récup',
  rest: 'repos',
  cooldown: 'retour au calme',
};

function formatDuration(duration: EnduranceDuration): string {
  if (duration.type === 'lap') {
    return 'au Lap';
  }
  if (duration.type === 'distance') {
    return duration.meters < 1000
      ? `${duration.meters} m`
      : `${Math.round(duration.meters / 100) / 10} km`;
  }
  const minutes = Math.round(duration.seconds / 60);
  return minutes >= 1 ? `${minutes} min` : `${duration.seconds} s`;
}

const STROKE_LABEL_FR: Record<SwimStroke, string> = {
  free: 'crawl',
  back: 'dos',
  breast: 'brasse',
  fly: 'papillon',
  im: '4 nages',
  drill: 'éducatif',
  mixed: 'nage au choix',
};

const INTENSITY_LABEL_FR: Partial<Record<SessionIntensity, string>> = {
  RECOVERY: 'récup',
  ENDURANCE: 'endurance',
  TEMPO: 'tempo',
  THRESHOLD: 'seuil',
  VO2MAX: 'VO2max',
};

/**
 * Steps named by what they are for, not by how hard they are.
 *
 * A warm-up is a warm-up whatever pace it holds; calling it "endurance" would
 * lose the only thing the reader needed. The work steps are the opposite — "bloc"
 * says nothing a glance can use.
 */
const ROLE_NAMED_KINDS = new Set<EnduranceStepKind>(['warmup', 'cooldown', 'rest']);

function formatStep(step: EnduranceStep, sport: EnduranceSport): string {
  // The stroke is what a pool set is about, so it replaces the generic step label.
  if (step.stroke) {
    return [formatDuration(step.duration), STROKE_LABEL_FR[step.stroke]].join(' ');
  }

  const intensity = ROLE_NAMED_KINDS.has(step.kind)
    ? null
    : intensityFromTarget(sport, step.target);
  const label = (intensity && INTENSITY_LABEL_FR[intensity]) ?? KIND_LABEL_FR[step.kind];
  return [formatDuration(step.duration), label].join(' ');
}

/**
 * Athlete-facing rendering of the structure, e.g.
 * "20 min échauffement · 6× (1 km seuil + 2 min récup) · 10 min retour au calme".
 *
 * Names the intent, never the resolved numbers. This line is persisted as the
 * session description, and a band written into it would still read 5:31/km long
 * after the threshold that produced it had moved.
 */
export function formatEndurancePrescriptionSummary(prescription: EndurancePrescription): string {
  const { sport } = prescription;
  return prescription.blocks
    .map((block) => {
      if (block.kind === 'step') {
        return formatStep(block.step, sport);
      }
      const inner = block.steps.map((step) => formatStep(step, sport)).join(' + ');
      return `${block.iterations}× (${inner})`;
    })
    .join(' · ');
}

function storedEndurancePrescription(
  raw: CoachEndurancePrescription | EndurancePrescription | null | undefined,
): EndurancePrescription | null {
  if ((raw !== undefined && raw !== null) && typeof raw === 'object' && 'version' in raw) {
    return raw as EndurancePrescription;
  }
  return null;
}

/**
 * Reconcile the structure and the prose before persisting.
 *
 * The structure is authoritative (ADR-017): when one exists, the description is
 * generated from it and any supplied prose is dropped — two independent statements
 * of the same session drift, and per-step intent belongs in `notes`. Sessions with
 * no structure keep their prose untouched.
 */
export function resolveEnduranceFieldsForPersist(input: {
  type: string;
  description?: string | null;
  intensity?: SessionIntensity | null;
  endurancePrescription?: CoachEndurancePrescription | EndurancePrescription | null;
}): { endurancePrescription: EndurancePrescription | null; description: string | null } {
  const description = input.description?.trim() || null;

  const prescription =
    storedEndurancePrescription(input.endurancePrescription) ??
    normalizeCoachEndurancePrescription({
      prescription: input.endurancePrescription as CoachEndurancePrescription | null | undefined,
      type: input.type,
      intensity: input.intensity ?? null,
    });

  if (!prescription) {
    return { endurancePrescription: null, description };
  }

  return {
    endurancePrescription: prescription,
    description: formatEndurancePrescriptionSummary(prescription),
  };
}

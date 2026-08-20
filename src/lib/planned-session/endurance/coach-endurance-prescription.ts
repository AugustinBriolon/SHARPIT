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
  type EnduranceBlock,
  type EnduranceDuration,
  type EndurancePrescription,
  type EnduranceSport,
  type EnduranceStep,
  type EnduranceStepKind,
} from '@/lib/planned-session/endurance/endurance-prescription';
import { defaultTargetForIntensity } from '@/lib/planned-session/endurance/endurance-targets';

const effortEnum = z.enum(['RECOVERY', 'ENDURANCE', 'TEMPO', 'THRESHOLD', 'VO2MAX', 'RACE']);

const coachEnduranceStepSchema = z
  .object({
    kind: z
      .enum(['warmup', 'interval', 'recovery', 'rest', 'cooldown'])
      .describe(
        "Rôle de l'étape : warmup (échauffement), interval (bloc de travail), recovery (récup active entre blocs), rest (repos complet), cooldown (retour au calme).",
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
    "Déroulé structuré d'une séance d'endurance (montre Garmin). Pour RUN et BIKE. Omettre pour STRENGTH.",
  );

export type CoachEndurancePrescription = z.infer<typeof coachEndurancePrescriptionSchema>;
type CoachEnduranceStep = z.infer<typeof coachEnduranceStepSchema>;

/** Recovery and rest carry their own intent, so they do not inherit the session's effort. */
const IMPLIED_EFFORT: Partial<Record<EnduranceStepKind, SessionIntensity>> = {
  warmup: 'RECOVERY',
  recovery: 'RECOVERY',
  cooldown: 'RECOVERY',
};

function clampSeconds(minutes: number): number {
  return Math.min(STEP_MAX_SECONDS, Math.max(STEP_MIN_SECONDS, Math.round(minutes * 60)));
}

function durationOf(step: CoachEnduranceStep): EnduranceDuration {
  if (step.lap) return { type: 'lap' };
  if (step.meters != null) return { type: 'distance', meters: step.meters };
  if (step.minutes != null) return { type: 'time', seconds: clampSeconds(step.minutes) };
  // A step with no stated end is an athlete-driven one — Lap is the honest reading.
  return { type: 'lap' };
}

function normalizeStep(
  step: CoachEnduranceStep,
  sport: EnduranceSport,
  sessionIntensity: SessionIntensity | null,
): EnduranceStep {
  const { kind } = step;
  const effort = step.effort ?? IMPLIED_EFFORT[kind] ?? sessionIntensity;
  const target =
    kind === 'rest' || effort == null ? NO_TARGET : defaultTargetForIntensity(sport, effort).target;

  return {
    kind,
    duration: durationOf(step),
    target,
    ...(step.notes?.trim() ? { notes: step.notes.trim() } : {}),
  };
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
  if (!sport || !input.prescription?.blocks?.length) return null;

  const blocks: EnduranceBlock[] = [];
  for (const block of input.prescription.blocks) {
    const steps = block.steps.map((step) => normalizeStep(step, sport, input.intensity ?? null));
    if (steps.length === 0) continue;

    if (block.times != null && block.times > 1) {
      blocks.push({ kind: 'repeat', iterations: block.times, steps });
      continue;
    }
    for (const step of steps) blocks.push({ kind: 'step', step });
  }

  if (blocks.length === 0) return null;

  return {
    version: 1,
    sport,
    ...(sport === 'SWIM' && input.prescription.poolLengthM != null
      ? { poolLengthM: input.prescription.poolLengthM }
      : {}),
    blocks: blocks.slice(0, 30),
  };
}

const KIND_LABEL_FR: Record<EnduranceStepKind, string> = {
  warmup: 'échauffement',
  interval: 'bloc',
  recovery: 'récup',
  rest: 'repos',
  cooldown: 'retour au calme',
};

function formatDuration(duration: EnduranceDuration): string {
  if (duration.type === 'lap') return 'au Lap';
  if (duration.type === 'distance') {
    return duration.meters < 1000
      ? `${duration.meters} m`
      : `${Math.round(duration.meters / 100) / 10} km`;
  }
  const minutes = Math.round(duration.seconds / 60);
  return minutes >= 1 ? `${minutes} min` : `${duration.seconds} s`;
}

function formatStep(step: EnduranceStep): string {
  const parts = [formatDuration(step.duration), KIND_LABEL_FR[step.kind]];
  return parts.join(' ');
}

/**
 * Athlete-facing rendering of the structure, e.g.
 * "20 min échauffement · 6× (1 km bloc + 2 min récup) · 10 min retour au calme".
 */
export function formatEndurancePrescriptionSummary(prescription: EndurancePrescription): string {
  return prescription.blocks
    .map((block) => {
      if (block.kind === 'step') return formatStep(block.step);
      const inner = block.steps.map(formatStep).join(' + ');
      return `${block.iterations}× (${inner})`;
    })
    .join(' · ');
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

  const raw = input.endurancePrescription;
  const alreadyStored =
    raw != null && typeof raw === 'object' && 'version' in raw
      ? (raw as EndurancePrescription)
      : null;

  const prescription =
    alreadyStored ??
    normalizeCoachEndurancePrescription({
      prescription: raw as CoachEndurancePrescription | null | undefined,
      type: input.type,
      intensity: input.intensity ?? null,
    });

  if (!prescription) return { endurancePrescription: null, description };

  return {
    endurancePrescription: prescription,
    description: formatEndurancePrescriptionSummary(prescription),
  };
}

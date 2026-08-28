import type {
  EnduranceBlock,
  EndurancePrescription,
} from '@/lib/planned-session/endurance/endurance-prescription';
import type { StrengthPrescription } from '@/lib/planned-session/strength/strength-prescription';

/**
 * Easing the workout itself, not just the figures above it.
 *
 * Cutting duration and load while leaving the prescription untouched leaves the
 * card claiming 25 minutes over a déroulé that still spells out 35 — and the
 * déroulé is the part the athlete actually follows.
 *
 * How it shrinks matters physiologically, so it is not a uniform scale:
 *
 * - A repeat block loses repetitions, never length. Six 800s cut to four 800s is
 *   the same session, shorter; six 600s is a different session that trains
 *   something else.
 * - A continuous step is scaled, because there is nothing else to take off it.
 * - Warm-up and cool-down are left alone. They are fixed overhead, and an athlete
 *   easing a session on a bad day needs the warm-up more, not less.
 * - A step measured by lap button has no quantity to reduce, so it stays.
 *
 * The same reasoning for strength: fewer sets, never fewer reps or less weight.
 */

/** Kept in step with `EASE_FACTOR` in `session-adjust`. */
export const EASE_FACTOR = 0.75;

/** Warm-up and cool-down are overhead, not the work being reduced. */
function isReducible(kind: string): boolean {
  return kind !== 'warmup' && kind !== 'cooldown';
}

function easeBlock(block: EnduranceBlock): EnduranceBlock {
  if (block.kind === 'repeat') {
    // Never below one: a block reduced to zero repetitions has been deleted, not eased.
    const iterations = Math.max(1, Math.round(block.iterations * EASE_FACTOR));
    return iterations === block.iterations ? block : { ...block, iterations };
  }

  const { step } = block;
  if (!isReducible(step.kind)) {
    return block;
  }

  if (step.duration.type === 'time') {
    // To the nearest 30 s — nobody follows a 337-second interval.
    const seconds = Math.max(30, Math.round((step.duration.seconds * EASE_FACTOR) / 30) * 30);
    if (seconds === step.duration.seconds) {
      return block;
    }
    return { ...block, step: { ...step, duration: { type: 'time', seconds } } };
  }

  if (step.duration.type === 'distance') {
    const meters = Math.max(25, Math.round((step.duration.meters * EASE_FACTOR) / 25) * 25);
    if (meters === step.duration.meters) {
      return block;
    }
    return { ...block, step: { ...step, duration: { type: 'distance', meters } } };
  }

  // `lap` ends on the athlete's own press — there is no quantity to take off it.
  return block;
}

export function easeEndurancePrescription(
  prescription: EndurancePrescription,
): EndurancePrescription | null {
  const blocks = prescription.blocks.map(easeBlock);
  const changed = blocks.some((block, index) => block !== prescription.blocks[index]);
  return changed ? { ...prescription, blocks } : null;
}

export function easeStrengthPrescription(
  prescription: StrengthPrescription,
): StrengthPrescription | null {
  const sets = prescription.sets.map((entry) => {
    const next = Math.max(1, Math.round(entry.sets * EASE_FACTOR));
    return next === entry.sets ? entry : { ...entry, sets: next };
  });
  const changed = sets.some((entry, index) => entry !== prescription.sets[index]);
  return changed ? { ...prescription, sets } : null;
}

/** "6 × 800 m", "25 min", "1,2 km" — the shape of a block, for a diff line. */
function describeBlock(block: EnduranceBlock): string {
  if (block.kind === 'repeat') {
    const [first] = block.steps;
    const inner = first ? describeDuration(first.duration) : '';
    return inner ? `${block.iterations} × ${inner}` : `${block.iterations} répétitions`;
  }
  return describeDuration(block.step.duration);
}

function describeDuration(
  duration: EnduranceBlock extends { kind: 'step' }
    ? never
    : { type: string; seconds?: number; meters?: number },
): string {
  if (duration.type === 'time' && (duration.seconds !== undefined && duration.seconds !== null)) {
    const minutes = Math.round(duration.seconds / 60);
    return `${minutes} min`;
  }
  if (duration.type === 'distance' && (duration.meters !== undefined && duration.meters !== null)) {
    return duration.meters >= 1000
      ? `${(duration.meters / 1000).toFixed(1).replace('.', ',')} km`
      : `${duration.meters} m`;
  }
  return 'au bouton';
}

/**
 * The lines of the déroulé that actually move, as "before → after".
 *
 * Only the changed ones: listing a warm-up unchanged beside three reduced
 * intervals buries the reduction in a copy of the whole workout.
 */
export function describeEnduranceEase(
  before: EndurancePrescription,
  after: EndurancePrescription,
): { before: string; after: string }[] {
  const lines: { before: string; after: string }[] = [];
  before.blocks.forEach((block, index) => {
    const next = after.blocks[index];
    if (!next) {
      return;
    }

    /* Compared by what they say, not by identity: the two prescriptions are
       parsed from JSON separately, so an untouched block is an equal object and
       never the same one. Reference equality listed every line as changed. */
    const from = describeBlock(block);
    const to = describeBlock(next);
    if (from === to) {
      return;
    }

    lines.push({ before: from, after: to });
  });
  return lines;
}

/** "Squat 4 × 10 → 3 × 10", for the movements whose set count drops. */
export function describeStrengthEase(
  before: StrengthPrescription,
  after: StrengthPrescription,
): { label: string; before: string; after: string }[] {
  const lines: { label: string; before: string; after: string }[] = [];
  before.sets.forEach((entry, index) => {
    const next = after.sets[index];
    if (!next || next.sets === entry.sets) {
      return;
    }
    lines.push({
      label: entry.exercise,
      before: `${entry.sets} × ${entry.reps}`,
      after: `${next.sets} × ${next.reps}`,
    });
  });
  return lines;
}

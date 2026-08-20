/**
 * Editable draft model for the endurance prescription editor (ADR-017).
 *
 * The editor holds strings — what a text input actually contains — and this
 * module converts both ways. Authoring goes through the same normalisation as
 * the coach's, so an athlete-built step and a coach-built one are identical
 * once stored.
 */
import type { SessionIntensity } from '@prisma/client';
import { createClientId } from '@/lib/client-id';
import {
  normalizeCoachEndurancePrescription,
  type CoachEndurancePrescription,
} from '@/lib/planned-session/endurance/coach-endurance-prescription';
import type {
  EndurancePrescription,
  EnduranceSport,
  EnduranceStep,
  EnduranceStepKind,
  EnduranceTarget,
} from '@/lib/planned-session/endurance/endurance-prescription';
import { defaultTargetForIntensity } from '@/lib/planned-session/endurance/endurance-targets';

/** `auto` = no explicit effort: the step inherits its kind's or the session's. */
export type EnduranceDraftEffort = SessionIntensity | 'auto';
export type EnduranceDraftMode = 'time' | 'distance' | 'lap';

export type EnduranceDraftStep = {
  key: string;
  kind: EnduranceStepKind;
  mode: EnduranceDraftMode;
  /** Minutes when mode is `time`, metres when `distance`, ignored on `lap`. */
  value: string;
  effort: EnduranceDraftEffort;
  notes: string;
};

export type EnduranceDraftBlock = {
  key: string;
  /** Repetitions of the whole block. "1" is a plain step. */
  times: string;
  steps: EnduranceDraftStep[];
};

const MATCHABLE_EFFORTS: readonly SessionIntensity[] = [
  'RECOVERY',
  'ENDURANCE',
  'TEMPO',
  'THRESHOLD',
  'VO2MAX',
];

export function newEnduranceDraftStep(partial?: Partial<EnduranceDraftStep>): EnduranceDraftStep {
  return {
    key: createClientId(),
    kind: 'interval',
    mode: 'time',
    value: '5',
    effort: 'auto',
    notes: '',
    ...partial,
  };
}

export function newEnduranceDraftBlock(
  partial?: Partial<EnduranceDraftBlock>,
): EnduranceDraftBlock {
  return {
    key: createClientId(),
    times: '1',
    steps: [newEnduranceDraftStep()],
    ...partial,
  };
}

/**
 * Recover the authored effort from a stored band by matching it against the
 * intensity table. A band that matches nothing was hand-tuned or came from an
 * absolute override, and reads back as `auto` rather than as a wrong label.
 */
function effortFromTarget(sport: EnduranceSport, target: EnduranceTarget): EnduranceDraftEffort {
  if (target.metric === 'none') return 'auto';
  for (const effort of MATCHABLE_EFFORTS) {
    const candidate = defaultTargetForIntensity(sport, effort).target;
    if (
      candidate.metric === target.metric &&
      candidate.pctMin === target.pctMin &&
      candidate.pctMax === target.pctMax
    ) {
      return effort;
    }
  }
  return 'auto';
}

function draftStepFrom(step: EnduranceStep, sport: EnduranceSport): EnduranceDraftStep {
  const { duration } = step;
  const mode: EnduranceDraftMode = duration.type === 'lap' ? 'lap' : duration.type;
  let value = '';
  if (duration.type === 'time') value = String(Math.round((duration.seconds / 60) * 10) / 10);
  if (duration.type === 'distance') value = String(duration.meters);

  return newEnduranceDraftStep({
    kind: step.kind,
    mode,
    value,
    effort: effortFromTarget(sport, step.target),
    notes: step.notes ?? '',
  });
}

/** Stored prescription → editable rows. An empty session starts with one block. */
export function draftFromEndurancePrescription(
  prescription: EndurancePrescription | null | undefined,
): EnduranceDraftBlock[] {
  if (!prescription?.blocks.length) return [];

  return prescription.blocks.map((block) => {
    if (block.kind === 'step') {
      return newEnduranceDraftBlock({
        times: '1',
        steps: [draftStepFrom(block.step, prescription.sport)],
      });
    }
    return newEnduranceDraftBlock({
      times: String(block.iterations),
      steps: block.steps.map((step) => draftStepFrom(step, prescription.sport)),
    });
  });
}

function coachStepFrom(step: EnduranceDraftStep) {
  const numeric = Number(step.value);
  const usable = Number.isFinite(numeric) && numeric > 0;

  return {
    kind: step.kind,
    ...(step.mode === 'lap' || !usable ? { lap: true } : {}),
    ...(step.mode === 'time' && usable ? { minutes: numeric } : {}),
    ...(step.mode === 'distance' && usable ? { meters: Math.round(numeric) } : {}),
    ...(step.effort === 'auto' ? {} : { effort: step.effort }),
    ...(step.notes.trim() ? { notes: step.notes.trim() } : {}),
  };
}

/**
 * Editable rows → stored prescription, through the coach's normalisation so both
 * authors produce the same shape. Returns null when nothing usable was drafted.
 */
export function endurancePrescriptionFromDraft(
  blocks: EnduranceDraftBlock[],
  session: { type: string; intensity?: SessionIntensity | null },
): EndurancePrescription | null {
  const authored: CoachEndurancePrescription = {
    blocks: blocks
      .filter((block) => block.steps.length > 0)
      .map((block) => {
        const times = Number(block.times);
        return {
          ...(Number.isFinite(times) && times > 1 ? { times: Math.round(times) } : {}),
          steps: block.steps.map(coachStepFrom),
        };
      }),
  };

  if (authored.blocks.length === 0) return null;

  return normalizeCoachEndurancePrescription({
    prescription: authored,
    type: session.type,
    intensity: session.intensity ?? null,
  });
}

/**
 * What a prescribed session will read as, once its targets are resolved.
 *
 * Shared by the Garmin payload builder and the session view, so the athlete
 * reads the same thing on the screen and on the wrist — the preview is not a
 * separate rendering that can drift from what is actually sent.
 */
import {
  resolveEnduranceTarget,
  formatPaceBand,
  type AthleteThresholds,
  type ResolvedTarget,
} from '@/lib/planned-session/endurance/endurance-targets';
import type {
  EnduranceDuration,
  EndurancePrescription,
  EnduranceStepKind,
  SwimStroke,
} from '@/lib/planned-session/endurance/endurance-prescription';

export const STROKE_LABEL_FR: Record<SwimStroke, string> = {
  free: 'Crawl',
  back: 'Dos',
  breast: 'Brasse',
  fly: 'Papillon',
  im: '4 nages',
  drill: 'Éducatif',
  mixed: 'Nage libre',
};

export const KIND_LABEL_FR: Record<EnduranceStepKind, string> = {
  warmup: 'Échauffement',
  interval: 'Bloc',
  recovery: 'Récup',
  rest: 'Repos',
  cooldown: 'Retour au calme',
};

/** Below a kilometre the watch reads better in metres (400 m, not 0.4 km). */
export const METER_DISPLAY_CEILING_M = 1000;

export function formatDurationLabel(duration: EnduranceDuration): string {
  if (duration.type === 'lap') {
    return 'Bouton Lap';
  }
  if (duration.type === 'distance') {
    return duration.meters < METER_DISPLAY_CEILING_M
      ? `${duration.meters} m`
      : `${Math.round(duration.meters / 100) / 10} km`;
  }
  const minutes = Math.floor(duration.seconds / 60);
  const seconds = duration.seconds % 60;
  if (minutes === 0) {
    return `${seconds} s`;
  }
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
}

export function formatTargetLabel(resolved: ResolvedTarget): string | null {
  switch (resolved.metric) {
    case 'pace':
      return formatPaceBand(resolved.paceSecFast, resolved.paceSecSlow, resolved.paceUnit);
    case 'hr':
      return `${resolved.bpmMin}–${resolved.bpmMax} bpm`;
    case 'power':
      return `${resolved.wattsMin}–${resolved.wattsMax} W`;
    case 'cadence':
      return `${resolved.min}–${resolved.max} rpm`;
    default:
      return null;
  }
}

/** One line of the session as the athlete reads it, repeat groups kept as groups. */
export type EndurancePreviewStep = {
  key: string;
  kind: EnduranceStepKind;
  kindLabel: string;
  /** Repetitions of the group this step belongs to. 1 for a plain step. */
  repeat: number;
  durationLabel: string;
  /** Resolved band, or null when the step carries no guidance. */
  targetLabel: string | null;
  strokeLabel: string | null;
  notes: string | null;
};

/**
 * Resolve a prescription for reading. Targets come from the thresholds passed in,
 * so a preview shown today matches what a push today would send.
 */
export function previewEnduranceSteps(
  prescription: EndurancePrescription,
  thresholds: AthleteThresholds,
): EndurancePreviewStep[] {
  const { sport } = prescription;
  const steps: EndurancePreviewStep[] = [];

  prescription.blocks.forEach((block, blockIndex) => {
    const inner = block.kind === 'step' ? [block.step] : block.steps;
    const repeat = block.kind === 'repeat' ? block.iterations : 1;

    inner.forEach((step, stepIndex) => {
      const { resolved } = resolveEnduranceTarget(step.target, thresholds, sport);
      steps.push({
        key: `${blockIndex}-${stepIndex}`,
        kind: step.kind,
        kindLabel: KIND_LABEL_FR[step.kind],
        repeat,
        durationLabel: formatDurationLabel(step.duration),
        targetLabel: formatTargetLabel(resolved),
        strokeLabel: sport === 'SWIM' && step.stroke ? STROKE_LABEL_FR[step.stroke] : null,
        notes: step.notes?.trim() || null,
      });
    });
  });

  return steps;
}

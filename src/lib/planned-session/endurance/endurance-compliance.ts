/**
 * Deterministic prescribed-vs-realised comparison for endurance sessions (ADR-019).
 *
 * Two questions, kept apart because they fail differently: was the structure
 * executed (coverage), and were the executed steps held inside their band
 * (adherence). Four blocks out of six at the right pace is a session cut short;
 * six out of six slightly too fast is a session run wrong.
 *
 * Steps whose target could not be resolved count for coverage only — scoring
 * adherence against a band that never existed would turn a missing threshold
 * into a failed session.
 */
import type { EndurancePrescription } from '@/lib/planned-session/endurance/endurance-prescription';
import { isSet } from '@/lib/util/value';
import type { StepSegment } from '@/lib/planned-session/endurance/endurance-segmentation';
import { segmentEnduranceActivity } from '@/lib/planned-session/endurance/endurance-segmentation';
import {
  resolveEnduranceTarget,
  type AthleteThresholds,
  type ResolvedTarget,
} from '@/lib/planned-session/endurance/endurance-targets';
import type { StreamSample } from '@/lib/streams/streams';

/** Same split as strength compliance, so a score means the same thing across sports. */
const WEIGHT_COVERAGE = 0.7;
const WEIGHT_ADHERENCE = 0.3;

export type StepCompliance = {
  /** Position in execution order, repeat groups expanded. */
  index: number;
  kind: StepSegment['ref']['step']['kind'];
  iteration: number;
  boundary: StepSegment['boundary'];
  plannedSec: number | null;
  actualSec: number;
  /** 0-1: how much of the step was executed. Below 1 only when cut short. */
  executedRatio: number;
  /** 0-1 share of the step's samples inside the band, null when not judged. */
  inBandRatio: number | null;
  /** Why a step carries no adherence, athlete-facing. */
  unjudgedReason: 'no-target' | 'no-signal' | null;
};

export type EnduranceCompliance = {
  prescribedCount: number;
  executedCount: number;
  /** 0-1 over the whole structure, partial credit for a step cut short. */
  coverage: number;
  /** 0-1 over judged steps, weighted by their duration. Null when none were. */
  adherence: number | null;
  /** 0-100, coverage 0.7 and adherence 0.3 — coverage alone when nothing was judged. */
  score: number;
  steps: StepCompliance[];
  /** Stream seconds the structure does not explain. */
  residualSec: number;
  truncated: boolean;
};

function plannedSeconds(segment: StepSegment): number | null {
  const { duration } = segment.ref.step;
  return duration.type === 'time' ? duration.seconds : null;
}

/**
 * How much of a step was done. A step that ran to its own end condition counts
 * fully; one the stream cut short is credited by what it did reach, in whichever
 * unit the step was written in.
 */
function executedRatioOf(
  segment: StepSegment,
  actualSec: number,
  plannedSec: number | null,
): number {
  if (segment.boundary !== 'truncated') {
    return 1;
  }

  if (isSet(plannedSec) && plannedSec > 0) {
    return Math.min(1, actualSec / plannedSec);
  }

  const { duration } = segment.ref.step;
  if (duration.type === 'distance' && isSet(segment.startM) && isSet(segment.endM)) {
    return Math.min(1, Math.max(0, segment.endM - segment.startM) / duration.meters);
  }

  // A Lap step has no stated end, so there is nothing to have fallen short of.
  return 1;
}

const METRIC_BAND_CHECKERS: Record<
  ResolvedTarget['metric'],
  (sample: StreamSample, target: ResolvedTarget) => boolean | null
> = {
  pace: (sample, target) => {
    if (target.metric !== 'pace') {
      return null;
    }
    if (sample.speed === undefined || sample.speed === null || sample.speed <= 0) {
      return null;
    }
    return sample.speed >= target.speedMsMin && sample.speed <= target.speedMsMax;
  },
  hr: (sample, target) => {
    if (target.metric !== 'hr') {
      return null;
    }
    return sample.hr === undefined || sample.hr === null
      ? null
      : sample.hr >= target.bpmMin && sample.hr <= target.bpmMax;
  },
  power: (sample, target) => {
    if (target.metric !== 'power') {
      return null;
    }
    return sample.watts === undefined || sample.watts === null
      ? null
      : sample.watts >= target.wattsMin && sample.watts <= target.wattsMax;
  },
  cadence: (sample, target) => {
    if (target.metric !== 'cadence') {
      return null;
    }
    return sample.cadence === undefined || sample.cadence === null
      ? null
      : sample.cadence >= target.min && sample.cadence <= target.max;
  },
  none: () => null,
};

/** Is this sample inside the band? Null when the sample carries no usable signal. */
function sampleInBand(sample: StreamSample, target: ResolvedTarget): boolean | null {
  return METRIC_BAND_CHECKERS[target.metric](sample, target);
}

function samplesWithin(
  samples: readonly StreamSample[],
  segment: StepSegment,
): readonly StreamSample[] {
  return samples.filter((sample) => sample.t >= segment.startSec && sample.t <= segment.endSec);
}

function judgeStep(
  segment: StepSegment,
  samples: readonly StreamSample[],
  thresholds: AthleteThresholds,
  sport: EndurancePrescription['sport'],
): { inBandRatio: number | null; unjudgedReason: StepCompliance['unjudgedReason'] } {
  const { resolved } = resolveEnduranceTarget(segment.ref.step.target, thresholds, sport);
  if (resolved.metric === 'none') {
    return { inBandRatio: null, unjudgedReason: 'no-target' };
  }

  const window = samplesWithin(samples, segment);
  let usable = 0;
  let inside = 0;
  for (const sample of window) {
    const verdict = sampleInBand(sample, resolved);
    if (verdict === undefined || verdict === null) {
      continue;
    }
    usable += 1;
    if (verdict) {
      inside += 1;
    }
  }

  if (usable === 0) {
    return { inBandRatio: null, unjudgedReason: 'no-signal' };
  }
  return { inBandRatio: inside / usable, unjudgedReason: null };
}

/**
 * Compare a structured session with what the athlete actually did.
 *
 * Returns null when there is nothing to compare — no structure, or no stream.
 * A session that cannot be measured must never read as a failed one.
 */
export function computeEnduranceCompliance(input: {
  prescription: EndurancePrescription;
  samples: readonly StreamSample[];
  thresholds: AthleteThresholds;
}): EnduranceCompliance | null {
  const segmentation = segmentEnduranceActivity({
    prescription: input.prescription,
    samples: input.samples,
  });
  if (!segmentation) {
    return null;
  }

  const steps: StepCompliance[] = segmentation.segments.map((segment) => {
    const actualSec = Math.max(0, segment.endSec - segment.startSec);
    const planned = plannedSeconds(segment);
    const executedRatio = executedRatioOf(segment, actualSec, planned);

    const { inBandRatio, unjudgedReason } = judgeStep(
      segment,
      input.samples,
      input.thresholds,
      input.prescription.sport,
    );

    return {
      index: segment.ref.index,
      kind: segment.ref.step.kind,
      iteration: segment.ref.iteration,
      boundary: segment.boundary,
      plannedSec: planned,
      actualSec,
      executedRatio,
      inBandRatio,
      unjudgedReason,
    };
  });

  const executedWork = steps.reduce((total, step) => total + step.executedRatio, 0);
  const coverage =
    segmentation.prescribedCount > 0 ? executedWork / segmentation.prescribedCount : 0;

  // Weighted by time: a twenty-second stride should not weigh like a five-minute block.
  const judged = steps.filter((step) => isSet(step.inBandRatio));
  const judgedSeconds = judged.reduce((total, step) => total + Math.max(1, step.actualSec), 0);
  const adherence =
    judged.length > 0
      ? judged.reduce(
          (total, step) => total + (step.inBandRatio ?? 0) * Math.max(1, step.actualSec),
          0,
        ) / judgedSeconds
      : null;

  const score =
    adherence === undefined || adherence === null
      ? Math.round(coverage * 100)
      : Math.round((WEIGHT_COVERAGE * coverage + WEIGHT_ADHERENCE * adherence) * 100);

  return {
    prescribedCount: segmentation.prescribedCount,
    executedCount: segmentation.executedCount,
    coverage,
    adherence,
    score,
    steps,
    residualSec: segmentation.residualSec,
    truncated: segmentation.truncated,
  };
}

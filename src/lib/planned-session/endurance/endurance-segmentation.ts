/**
 * Where each prescribed step happened inside a realised activity (ADR-019).
 *
 * No lap is ingested, so the boundaries are derived: the prescribed steps are
 * walked in order and a cursor advances through the stream by each step's own
 * end condition. This is a hypothesis about where the blocks were, not a
 * measurement of it — every segment says how its boundary was obtained, and the
 * unexplained tail is reported so a caller can treat a poor alignment as low
 * confidence rather than as a failed session.
 */
import type { StreamSample } from '@/lib/streams/streams';
import type {
  EndurancePrescription,
  EnduranceStep,
} from '@/lib/planned-session/endurance/endurance-prescription';

export type PrescribedStepRef = {
  /** Position in execution order, repeat groups expanded. */
  index: number;
  /** Index of the block this step belongs to. */
  blockIndex: number;
  /** 1-based repetition, always 1 for a plain step. */
  iteration: number;
  step: EnduranceStep;
};

/** How a segment's end was decided — the caller's cue for how much to trust it. */
export type SegmentBoundary =
  | 'time'
  | 'distance'
  /** Lap-ended step: given an equal share of the time the plan does not account for. */
  | 'lap-share'
  /** The stream ended mid-step. */
  | 'truncated';

export type StepSegment = {
  ref: PrescribedStepRef;
  /** Seconds from activity start. */
  startSec: number;
  endSec: number;
  /** Cumulative metres at the boundaries, when the stream carries distance. */
  startM: number | null;
  endM: number | null;
  boundary: SegmentBoundary;
};

export type EnduranceSegmentation = {
  segments: StepSegment[];
  prescribedCount: number;
  /** Steps that got a window — the rest never started before the stream ended. */
  executedCount: number;
  /** Stream seconds after the last prescribed step: warm-down, extra work, or drift. */
  residualSec: number;
  /** True when the stream ran out before the structure did. */
  truncated: boolean;
};

/** Execution order of a prescription: a repeat group becomes its steps, repeated. */
export function flattenEnduranceSteps(prescription: EndurancePrescription): PrescribedStepRef[] {
  const refs: PrescribedStepRef[] = [];

  prescription.blocks.forEach((block, blockIndex) => {
    if (block.kind === 'step') {
      refs.push({ index: refs.length, blockIndex, iteration: 1, step: block.step });
      return;
    }
    for (let iteration = 1; iteration <= block.iterations; iteration += 1) {
      for (const step of block.steps) {
        refs.push({ index: refs.length, blockIndex, iteration, step });
      }
    }
  });

  return refs;
}

function lastSample(samples: readonly StreamSample[]): StreamSample | null {
  return samples.length > 0 ? (samples[samples.length - 1] ?? null) : null;
}

/** First sample at or after `seconds`, or the last one when the stream ends first. */
function sampleAtTime(
  samples: readonly StreamSample[],
  fromIndex: number,
  seconds: number,
): { sample: StreamSample; index: number } {
  for (let i = fromIndex; i < samples.length; i += 1) {
    const sample = samples[i] as StreamSample;
    if (sample.t >= seconds) return { sample, index: i };
  }
  const index = samples.length - 1;
  return { sample: samples[index] as StreamSample, index };
}

/** First sample at or past `metres` of cumulative distance, or null if never reached. */
function sampleAtDistance(
  samples: readonly StreamSample[],
  fromIndex: number,
  metres: number,
): { sample: StreamSample; index: number } | null {
  for (let i = fromIndex; i < samples.length; i += 1) {
    const sample = samples[i] as StreamSample;
    if (sample.d >= metres) return { sample, index: i };
  }
  return null;
}

/**
 * Seconds to give each Lap-ended step: the time the plan does not otherwise
 * account for, split evenly. Distance steps are costed at the session's own
 * average speed, which is the only estimator available before the walk.
 */
function lapShareSeconds(steps: readonly PrescribedStepRef[], last: StreamSample): number {
  const lapCount = steps.filter((ref) => ref.step.duration.type === 'lap').length;
  if (lapCount === 0) return 0;

  const avgSpeed = last.t > 0 && last.d > 0 ? last.d / last.t : 0;

  let accounted = 0;
  for (const ref of steps) {
    const { duration } = ref.step;
    if (duration.type === 'time') accounted += duration.seconds;
    else if (duration.type === 'distance' && avgSpeed > 0) accounted += duration.meters / avgSpeed;
  }

  return Math.max(0, (last.t - accounted) / lapCount);
}

/**
 * Align a prescription with a realised stream.
 *
 * Returns null when there is nothing to align — no steps, or no usable samples.
 * A missing stream is not a failed session, so callers must treat null as
 * "cannot measure" rather than as a zero.
 */
export function segmentEnduranceActivity(input: {
  prescription: EndurancePrescription;
  samples: readonly StreamSample[];
}): EnduranceSegmentation | null {
  const steps = flattenEnduranceSteps(input.prescription);
  const last = lastSample(input.samples);
  if (steps.length === 0 || !last || last.t <= 0) return null;

  const lapShare = lapShareSeconds(steps, last);
  const segments: StepSegment[] = [];

  let cursorSec = 0;
  let cursorIndex = 0;
  let truncated = false;

  for (const ref of steps) {
    if (cursorSec >= last.t) {
      truncated = true;
      break;
    }

    const start = sampleAtTime(input.samples, cursorIndex, cursorSec);
    const { duration } = ref.step;
    let endSec: number;
    let boundary: SegmentBoundary;

    if (duration.type === 'time') {
      endSec = cursorSec + duration.seconds;
      boundary = 'time';
    } else if (duration.type === 'distance') {
      const reached = sampleAtDistance(
        input.samples,
        start.index,
        start.sample.d + duration.meters,
      );
      endSec = reached ? reached.sample.t : last.t;
      boundary = reached ? 'distance' : 'truncated';
    } else {
      endSec = cursorSec + lapShare;
      boundary = 'lap-share';
    }

    // Strictly beyond the stream, not merely reaching its end: a step that lands
    // on the last sample was completed, not cut off.
    if (endSec > last.t) {
      endSec = last.t;
      boundary = 'truncated';
    }

    const end = sampleAtTime(input.samples, start.index, endSec);
    segments.push({
      ref,
      startSec: Math.round(start.sample.t),
      endSec: Math.round(endSec),
      startM: Number.isFinite(start.sample.d) ? Math.round(start.sample.d) : null,
      endM: Number.isFinite(end.sample.d) ? Math.round(end.sample.d) : null,
      boundary,
    });

    cursorSec = endSec;
    cursorIndex = end.index;
  }

  if (segments.length < steps.length) truncated = true;

  const lastSegment = segments[segments.length - 1];
  const residualSec = lastSegment ? Math.max(0, Math.round(last.t - lastSegment.endSec)) : 0;

  return {
    segments,
    prescribedCount: steps.length,
    executedCount: segments.length,
    residualSec,
    truncated,
  };
}

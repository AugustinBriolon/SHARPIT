import { describe, expect, it } from 'vitest';
import type { EndurancePrescription } from '@/lib/planned-session/endurance/endurance-prescription';
import {
  flattenEnduranceSteps,
  segmentEnduranceActivity,
} from '@/lib/planned-session/endurance/endurance-segmentation';
import type { StreamSample } from '@/lib/streams/streams';

/** 1 Hz stream at a constant speed, which makes every expectation arithmetic. */
function streamAt(speedMs: number, seconds: number): StreamSample[] {
  return Array.from({ length: seconds + 1 }, (_, t) => ({
    t,
    d: t * speedMs,
    alt: null,
    hr: null,
    watts: null,
    cadence: null,
    speed: speedMs,
  }));
}

const NO_TARGET = { metric: 'none' } as const;

function prescription(blocks: EndurancePrescription['blocks']): EndurancePrescription {
  return { version: 1, sport: 'RUN', blocks };
}

const INTERVALS = prescription([
  {
    kind: 'step',
    step: { kind: 'warmup', duration: { type: 'time', seconds: 600 }, target: NO_TARGET },
  },
  {
    kind: 'repeat',
    iterations: 3,
    steps: [
      { kind: 'interval', duration: { type: 'distance', meters: 1000 }, target: NO_TARGET },
      { kind: 'recovery', duration: { type: 'time', seconds: 120 }, target: NO_TARGET },
    ],
  },
  {
    kind: 'step',
    step: { kind: 'cooldown', duration: { type: 'time', seconds: 300 }, target: NO_TARGET },
  },
]);

describe('flattenEnduranceSteps', () => {
  it('expands a repeat group into its executed order', () => {
    const refs = flattenEnduranceSteps(INTERVALS);

    expect(refs).toHaveLength(1 + 3 * 2 + 1);
    expect(refs.map((ref) => ref.step.kind)).toEqual([
      'warmup',
      'interval',
      'recovery',
      'interval',
      'recovery',
      'interval',
      'recovery',
      'cooldown',
    ]);
    expect(refs[3]).toMatchObject({ blockIndex: 1, iteration: 2 });
  });
});

describe('segmentEnduranceActivity', () => {
  it('walks time and distance steps into consecutive windows', () => {
    // 4 m/s: each 1000 m block takes 250 s. 600 + 3×(250 + 120) + 300 = 2010 s.
    const result = segmentEnduranceActivity({
      prescription: INTERVALS,
      samples: streamAt(4, 2010),
    });

    expect(result?.executedCount).toBe(8);
    expect(result?.truncated).toBe(false);
    expect(result?.residualSec).toBe(0);

    const [warmup, firstBlock, firstRecovery] = result!.segments;
    expect(warmup).toMatchObject({ startSec: 0, endSec: 600, boundary: 'time' });
    expect(firstBlock).toMatchObject({ startSec: 600, endSec: 850, boundary: 'distance' });
    expect(firstRecovery).toMatchObject({ startSec: 850, endSec: 970, boundary: 'time' });
  });

  it('does not call the last step truncated when it lands on the stream end', () => {
    const result = segmentEnduranceActivity({
      prescription: INTERVALS,
      samples: streamAt(4, 2010),
    });

    expect(result?.segments.at(-1)).toMatchObject({ endSec: 2010, boundary: 'time' });
  });

  it('reports the tail the structure does not explain', () => {
    const result = segmentEnduranceActivity({
      prescription: INTERVALS,
      samples: streamAt(4, 2310),
    });

    expect(result?.residualSec).toBe(300);
    expect(result?.truncated).toBe(false);
  });

  it('marks a session cut short instead of inventing the missing steps', () => {
    // Stops during the second block: only the first four steps get a window.
    const result = segmentEnduranceActivity({
      prescription: INTERVALS,
      samples: streamAt(4, 1100),
    });

    expect(result?.truncated).toBe(true);
    expect(result?.executedCount).toBeLessThan(result!.prescribedCount);
    expect(result?.segments.at(-1)?.boundary).toBe('truncated');
  });

  it('truncates a distance step the athlete never completed', () => {
    const result = segmentEnduranceActivity({
      prescription: prescription([
        {
          kind: 'step',
          step: {
            kind: 'interval',
            duration: { type: 'distance', meters: 5000 },
            target: NO_TARGET,
          },
        },
      ]),
      samples: streamAt(4, 600),
    });

    expect(result?.segments[0]).toMatchObject({ boundary: 'truncated', endSec: 600 });
  });

  it('gives lap steps an equal share of the time the plan does not account for', () => {
    // 600 s of stream, one 200 s timed step: the two lap steps split the other 400 s.
    const result = segmentEnduranceActivity({
      prescription: prescription([
        {
          kind: 'step',
          step: { kind: 'warmup', duration: { type: 'time', seconds: 200 }, target: NO_TARGET },
        },
        { kind: 'step', step: { kind: 'interval', duration: { type: 'lap' }, target: NO_TARGET } },
        { kind: 'step', step: { kind: 'cooldown', duration: { type: 'lap' }, target: NO_TARGET } },
      ]),
      samples: streamAt(3, 600),
    });

    const [, lapOne, lapTwo] = result!.segments;
    expect(lapOne).toMatchObject({ startSec: 200, endSec: 400, boundary: 'lap-share' });
    expect(lapTwo.startSec).toBe(400);
    expect(lapTwo.endSec).toBe(600);
  });

  it('carries the distance boundaries when the stream has them', () => {
    const result = segmentEnduranceActivity({
      prescription: prescription([
        {
          kind: 'step',
          step: {
            kind: 'interval',
            duration: { type: 'distance', meters: 1000 },
            target: NO_TARGET,
          },
        },
      ]),
      samples: streamAt(4, 600),
    });

    expect(result?.segments[0]).toMatchObject({ startM: 0, endM: 1000 });
  });

  it('cannot measure without steps or without a stream', () => {
    expect(segmentEnduranceActivity({ prescription: INTERVALS, samples: [] })).toBeNull();
    expect(
      segmentEnduranceActivity({ prescription: prescription([]), samples: streamAt(4, 100) }),
    ).toBeNull();
  });
});

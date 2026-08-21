import { describe, expect, it } from 'vitest';
import { computeEnduranceCompliance } from '@/lib/planned-session/endurance/endurance-compliance';
import type { EndurancePrescription } from '@/lib/planned-session/endurance/endurance-prescription';
import type { AthleteThresholds } from '@/lib/planned-session/endurance/endurance-targets';
import type { StreamSample } from '@/lib/streams/streams';

/** Threshold pace 4:00/km → threshold speed 4.167 m/s. */
const THRESHOLDS: AthleteThresholds = {
  runThresholdPaceSecPerKm: 240,
  swimCssSecPer100m: null,
  ftpW: 250,
  lthr: 165,
  maxHr: 190,
};

/**
 * A threshold band is ±2.5 % of threshold speed: 234–246 s/km, so 4.06–4.27 m/s.
 * 4.15 sits inside it, 3.40 well outside.
 */
const THRESHOLD_TARGET = { metric: 'pace', pctMin: 97.5, pctMax: 102.5 } as const;
const NO_TARGET = { metric: 'none' } as const;

type SampleOverrides = Partial<Pick<StreamSample, 'hr' | 'watts' | 'cadence' | 'speed'>>;

/** 1 Hz stream, constant speed, with optional signals. */
function stream(speedMs: number, seconds: number, overrides: SampleOverrides = {}): StreamSample[] {
  return Array.from({ length: seconds + 1 }, (_, t) => ({
    t,
    d: t * speedMs,
    alt: null,
    hr: null,
    watts: null,
    cadence: null,
    speed: speedMs,
    ...overrides,
  }));
}

/** Two 300 s blocks at threshold, no warm-up, so every expectation is arithmetic. */
const TWO_BLOCKS: EndurancePrescription = {
  version: 1,
  sport: 'RUN',
  blocks: [
    {
      kind: 'repeat',
      iterations: 2,
      steps: [
        { kind: 'interval', duration: { type: 'time', seconds: 300 }, target: THRESHOLD_TARGET },
      ],
    },
  ],
};

describe('computeEnduranceCompliance', () => {
  it('scores a session held inside the band at 100', () => {
    const result = computeEnduranceCompliance({
      prescription: TWO_BLOCKS,
      samples: stream(4.15, 600),
      thresholds: THRESHOLDS,
    });

    expect(result?.coverage).toBe(1);
    expect(result?.adherence).toBe(1);
    expect(result?.score).toBe(100);
    expect(result?.truncated).toBe(false);
  });

  it('separates a session run wrong from a session cut short', () => {
    const runWrong = computeEnduranceCompliance({
      prescription: TWO_BLOCKS,
      samples: stream(3.4, 600),
      thresholds: THRESHOLDS,
    });
    const cutShort = computeEnduranceCompliance({
      prescription: TWO_BLOCKS,
      samples: stream(4.15, 300),
      thresholds: THRESHOLDS,
    });

    // Everything done, none of it in the band: coverage carries the score alone.
    expect(runWrong?.coverage).toBe(1);
    expect(runWrong?.adherence).toBe(0);
    expect(runWrong?.score).toBe(70);

    // Half the structure, perfectly executed.
    expect(cutShort?.coverage).toBe(0.5);
    expect(cutShort?.adherence).toBe(1);
    expect(cutShort?.score).toBe(65);
    expect(cutShort?.truncated).toBe(true);
  });

  it('gives partial credit to a step the athlete abandoned mid-way', () => {
    const result = computeEnduranceCompliance({
      prescription: TWO_BLOCKS,
      samples: stream(4.15, 450),
      thresholds: THRESHOLDS,
    });

    const [first, second] = result!.steps;
    expect(first.executedRatio).toBe(1);
    expect(second).toMatchObject({ boundary: 'truncated', executedRatio: 0.5 });
    expect(result?.coverage).toBe(0.75);
  });

  it('weights adherence by step duration, not by step count', () => {
    const prescription: EndurancePrescription = {
      version: 1,
      sport: 'RUN',
      blocks: [
        {
          kind: 'step',
          step: {
            kind: 'interval',
            duration: { type: 'time', seconds: 60 },
            target: THRESHOLD_TARGET,
          },
        },
        {
          kind: 'step',
          step: {
            kind: 'interval',
            duration: { type: 'time', seconds: 540 },
            target: THRESHOLD_TARGET,
          },
        },
      ],
    };

    // First minute inside the band, the following nine outside.
    const samples = [
      ...stream(4.15, 60),
      ...stream(3.4, 540).map((sample) => ({
        ...sample,
        t: sample.t + 60,
        d: sample.d + 60 * 4.15,
      })),
    ];

    const result = computeEnduranceCompliance({ prescription, samples, thresholds: THRESHOLDS });

    // Count-weighted would give 0.5; time-weighted lands near the long block's value.
    expect(result?.adherence).toBeLessThan(0.2);
  });

  it('counts a step with no resolvable target for coverage only', () => {
    const result = computeEnduranceCompliance({
      prescription: {
        version: 1,
        sport: 'RUN',
        blocks: [
          {
            kind: 'step',
            step: { kind: 'warmup', duration: { type: 'time', seconds: 600 }, target: NO_TARGET },
          },
        ],
      },
      samples: stream(3, 600),
      thresholds: THRESHOLDS,
    });

    expect(result?.steps[0]).toMatchObject({ inBandRatio: null, unjudgedReason: 'no-target' });
    expect(result?.adherence).toBeNull();
    // Coverage alone: a missing band must not read as a failed session.
    expect(result?.score).toBe(100);
  });

  it('reports a step it cannot judge for lack of signal', () => {
    const result = computeEnduranceCompliance({
      prescription: {
        version: 1,
        sport: 'BIKE',
        blocks: [
          {
            kind: 'step',
            step: {
              kind: 'interval',
              duration: { type: 'time', seconds: 300 },
              target: { metric: 'power', pctMin: 95.5, pctMax: 100.5 },
            },
          },
        ],
      },
      // A ride with no power meter: the band exists, the signal does not.
      samples: stream(8, 300),
      thresholds: THRESHOLDS,
    });

    expect(result?.steps[0]).toMatchObject({ inBandRatio: null, unjudgedReason: 'no-signal' });
    expect(result?.adherence).toBeNull();
  });

  it('judges a heart-rate band against the heart-rate signal', () => {
    const result = computeEnduranceCompliance({
      prescription: {
        version: 1,
        sport: 'RUN',
        blocks: [
          {
            kind: 'step',
            step: {
              kind: 'interval',
              duration: { type: 'time', seconds: 300 },
              target: { metric: 'hr', hrRef: 'lthr', pctMin: 97.5, pctMax: 102.5 },
            },
          },
        ],
      },
      samples: stream(4, 300, { hr: 165 }),
      thresholds: THRESHOLDS,
    });

    expect(result?.steps[0].inBandRatio).toBe(1);
  });

  it('cannot measure a session with no stream', () => {
    expect(
      computeEnduranceCompliance({
        prescription: TWO_BLOCKS,
        samples: [],
        thresholds: THRESHOLDS,
      }),
    ).toBeNull();
  });
});

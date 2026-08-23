import { describe, expect, it } from 'vitest';
import type {
  EnduranceBlock,
  EndurancePrescription,
} from '@/lib/planned-session/endurance/endurance-prescription';
import type { StrengthPrescription } from '@/lib/planned-session/strength/strength-prescription';
import {
  describeEnduranceEase,
  easeEndurancePrescription,
  easeStrengthPrescription,
} from './ease-prescription';

const NO_TARGET = { metric: 'none' } as const;

function timeStep(kind: string, seconds: number): EnduranceBlock {
  return {
    kind: 'step',
    step: { kind, duration: { type: 'time', seconds }, target: NO_TARGET },
  } as EnduranceBlock;
}

function prescription(blocks: EnduranceBlock[]): EndurancePrescription {
  return { version: 1, sport: 'RUN', blocks } as EndurancePrescription;
}

describe('easeEndurancePrescription', () => {
  it('takes repetitions off an interval block, never length', () => {
    const repeat = {
      kind: 'repeat',
      iterations: 6,
      steps: [{ kind: 'interval', duration: { type: 'distance', meters: 800 }, target: NO_TARGET }],
    } as EnduranceBlock;

    const eased = easeEndurancePrescription(prescription([repeat]));
    const block = eased!.blocks[0] as Extract<EnduranceBlock, { kind: 'repeat' }>;

    // Six 800s become four 800s — the same session, shorter. Six 600s would be
    // a different session altogether.
    expect(block.iterations).toBe(5);
    expect(block.steps[0].duration).toEqual({ type: 'distance', meters: 800 });
  });

  it('never reduces a repeat block out of existence', () => {
    const single = { kind: 'repeat', iterations: 1, steps: [] } as unknown as EnduranceBlock;
    expect(easeEndurancePrescription(prescription([single]))).toBeNull();
  });

  it('scales a continuous step, rounded to something followable', () => {
    const eased = easeEndurancePrescription(prescription([timeStep('interval', 3600)]));
    const block = eased!.blocks[0] as Extract<EnduranceBlock, { kind: 'step' }>;
    expect(block.step.duration).toEqual({ type: 'time', seconds: 2700 });
  });

  it('leaves the warm-up and the cool-down alone', () => {
    const blocks = [timeStep('warmup', 600), timeStep('cooldown', 600)];
    expect(easeEndurancePrescription(prescription(blocks))).toBeNull();
  });

  it('leaves a lap-button step alone — there is no quantity to take off it', () => {
    const lap = {
      kind: 'step',
      step: { kind: 'interval', duration: { type: 'lap' }, target: NO_TARGET },
    } as EnduranceBlock;
    expect(easeEndurancePrescription(prescription([lap]))).toBeNull();
  });

  it('reports nothing rather than an identical prescription', () => {
    expect(easeEndurancePrescription(prescription([]))).toBeNull();
  });
});

describe('easeStrengthPrescription', () => {
  function strength(sets: number[]): StrengthPrescription {
    return {
      version: 1,
      sets: sets.map((count, order) => ({
        exercise: `Exo ${order}`,
        sets: count,
        reps: 10,
        order,
      })),
    } as StrengthPrescription;
  }

  it('takes sets off, never reps or weight', () => {
    const eased = easeStrengthPrescription(strength([4]));
    expect(eased?.sets[0].sets).toBe(3);
    expect(eased?.sets[0].reps).toBe(10);
  });

  it('leaves at least one set of every movement', () => {
    expect(easeStrengthPrescription(strength([1]))).toBeNull();
  });

  it('reports nothing when rounding changes none of them', () => {
    expect(easeStrengthPrescription(strength([1, 1]))).toBeNull();
  });
});

describe('describeEnduranceEase', () => {
  it('lists only the lines that actually move', () => {
    const before = prescription([
      timeStep('warmup', 600),
      timeStep('interval', 1500),
      timeStep('cooldown', 300),
    ]);
    const after = easeEndurancePrescription(before)!;

    // Parsed separately in the dialog, so equal blocks are never the same object.
    const lines = describeEnduranceEase(before, JSON.parse(JSON.stringify(after)));
    expect(lines).toEqual([{ before: '25 min', after: '19 min' }]);
  });

  it('says how many repetitions are left, at the same length', () => {
    const before = prescription([
      {
        kind: 'repeat',
        iterations: 6,
        steps: [
          { kind: 'interval', duration: { type: 'distance', meters: 800 }, target: NO_TARGET },
        ],
      } as EnduranceBlock,
    ]);
    const after = easeEndurancePrescription(before)!;

    expect(describeEnduranceEase(before, after)).toEqual([
      { before: '6 × 800 m', after: '5 × 800 m' },
    ]);
  });
});

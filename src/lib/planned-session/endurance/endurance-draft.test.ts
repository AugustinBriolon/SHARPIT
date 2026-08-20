import { describe, expect, it } from 'vitest';
import {
  draftFromEndurancePrescription,
  endurancePrescriptionFromDraft,
  newEnduranceDraftBlock,
  newEnduranceDraftStep,
} from '@/lib/planned-session/endurance/endurance-draft';

const RUN_SESSION = { type: 'RUN', intensity: 'THRESHOLD' } as const;

describe('endurancePrescriptionFromDraft', () => {
  it('builds a repeat group and derives its band from the step effort', () => {
    const prescription = endurancePrescriptionFromDraft(
      [
        newEnduranceDraftBlock({
          times: '6',
          steps: [
            newEnduranceDraftStep({
              kind: 'interval',
              mode: 'distance',
              value: '1000',
              effort: 'THRESHOLD',
            }),
            newEnduranceDraftStep({ kind: 'recovery', mode: 'time', value: '2' }),
          ],
        }),
      ],
      RUN_SESSION,
    );

    const [block] = prescription?.blocks ?? [];
    expect(block?.kind).toBe('repeat');
    expect(block?.kind === 'repeat' && block.iterations).toBe(6);
    expect(block?.kind === 'repeat' && block.steps[0].target).toMatchObject({
      metric: 'pace',
      pctMin: 97.5,
      pctMax: 102.5,
    });
  });

  it('reads a blank or unusable duration as a Lap-button step', () => {
    const prescription = endurancePrescriptionFromDraft(
      [newEnduranceDraftBlock({ steps: [newEnduranceDraftStep({ mode: 'time', value: '' })] })],
      RUN_SESSION,
    );

    const [block] = prescription?.blocks ?? [];
    expect(block?.kind === 'step' && block.step.duration).toEqual({ type: 'lap' });
  });

  it('returns null when nothing was drafted', () => {
    expect(endurancePrescriptionFromDraft([], RUN_SESSION)).toBeNull();
  });
});

describe('draftFromEndurancePrescription', () => {
  it('round-trips a structure without losing its steps or efforts', () => {
    const blocks = [
      newEnduranceDraftBlock({
        times: '1',
        steps: [newEnduranceDraftStep({ kind: 'warmup', mode: 'time', value: '20' })],
      }),
      newEnduranceDraftBlock({
        times: '4',
        steps: [
          newEnduranceDraftStep({
            kind: 'interval',
            mode: 'time',
            value: '5',
            effort: 'VO2MAX',
            notes: 'Relâche les épaules',
          }),
          newEnduranceDraftStep({ kind: 'recovery', mode: 'time', value: '3' }),
        ],
      }),
    ];

    const stored = endurancePrescriptionFromDraft(blocks, { type: 'RUN', intensity: 'VO2MAX' });
    const reloaded = draftFromEndurancePrescription(stored);

    expect(reloaded).toHaveLength(2);
    expect(reloaded[1].times).toBe('4');
    expect(reloaded[1].steps[0]).toMatchObject({
      kind: 'interval',
      mode: 'time',
      value: '5',
      effort: 'VO2MAX',
      notes: 'Relâche les épaules',
    });
  });

  it('reads a band matching no anchor back as auto rather than mislabelling it', () => {
    const reloaded = draftFromEndurancePrescription({
      version: 1,
      sport: 'RUN',
      blocks: [
        {
          kind: 'step',
          step: {
            kind: 'interval',
            duration: { type: 'time', seconds: 600 },
            target: { metric: 'pace', pctMin: 88, pctMax: 91 },
          },
        },
      ],
    });

    expect(reloaded[0].steps[0].effort).toBe('auto');
  });

  it('starts empty for a session with no structure', () => {
    expect(draftFromEndurancePrescription(null)).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import {
  formatEndurancePrescriptionSummary,
  normalizeCoachEndurancePrescription,
  resolveEnduranceFieldsForPersist,
  type CoachEndurancePrescription,
} from '@/lib/planned-session/endurance/coach-endurance-prescription';

/** 20 min warmup · 6×(1000 m threshold + 2 min recovery) · 10 min cooldown. */
const INTERVALS: CoachEndurancePrescription = {
  blocks: [
    { steps: [{ kind: 'warmup', minutes: 20 }] },
    {
      times: 6,
      steps: [
        { kind: 'interval', meters: 1000, effort: 'THRESHOLD' },
        { kind: 'recovery', minutes: 2 },
      ],
    },
    { steps: [{ kind: 'cooldown', minutes: 10 }] },
  ],
};

describe('normalizeCoachEndurancePrescription', () => {
  it('turns authored intent into steps and one repeat group', () => {
    const prescription = normalizeCoachEndurancePrescription({
      prescription: INTERVALS,
      type: 'RUN',
      intensity: 'THRESHOLD',
    });

    expect(prescription?.sport).toBe('RUN');
    expect(prescription?.blocks).toHaveLength(3);
    expect(prescription?.blocks[1]).toMatchObject({ kind: 'repeat', iterations: 6 });
  });

  it('derives the band from the step effort instead of trusting authored numbers', () => {
    const prescription = normalizeCoachEndurancePrescription({
      prescription: INTERVALS,
      type: 'RUN',
      intensity: 'THRESHOLD',
    });

    const group = prescription?.blocks[1];
    const work = group?.kind === 'repeat' ? group.steps[0] : null;
    expect(work?.target).toMatchObject({ metric: 'pace', pctMin: 97.5, pctMax: 102.5 });
  });

  it('gives a bike session power targets anchored on FTP', () => {
    const prescription = normalizeCoachEndurancePrescription({
      prescription: {
        blocks: [{ times: 3, steps: [{ kind: 'interval', minutes: 15, effort: 'TEMPO' }] }],
      },
      type: 'BIKE',
      intensity: 'TEMPO',
    });

    const group = prescription?.blocks[0];
    const work = group?.kind === 'repeat' ? group.steps[0] : null;
    expect(work?.target).toMatchObject({ metric: 'power', pctMin: 80.5, pctMax: 85.5 });
  });

  it('guides the work and leaves everything around it free', () => {
    const prescription = normalizeCoachEndurancePrescription({
      prescription: {
        blocks: [
          { steps: [{ kind: 'warmup', minutes: 15 }] },
          { steps: [{ kind: 'interval', minutes: 10 }] },
          { steps: [{ kind: 'recovery', minutes: 3 }] },
          { steps: [{ kind: 'rest', minutes: 3 }] },
          { steps: [{ kind: 'cooldown', minutes: 10 }] },
        ],
      },
      type: 'RUN',
      intensity: 'VO2MAX',
    });

    const [warmup, interval, recovery, rest, cooldown] = prescription?.blocks ?? [];
    expect(interval?.kind === 'step' && interval.step.target.metric).toBe('pace');
    for (const block of [warmup, recovery, rest, cooldown]) {
      expect(block?.kind === 'step' && block.step.target).toEqual({ metric: 'none' });
    }
  });

  it('ignores an effort explicitly set on a step that carries no guidance', () => {
    const prescription = normalizeCoachEndurancePrescription({
      prescription: { blocks: [{ steps: [{ kind: 'warmup', minutes: 15, effort: 'TEMPO' }] }] },
      type: 'RUN',
      intensity: 'VO2MAX',
    });

    const [warmup] = prescription?.blocks ?? [];
    expect(warmup?.kind === 'step' && warmup.step.target).toEqual({ metric: 'none' });
  });

  it('reads a step with no stated end as a Lap-button step', () => {
    const prescription = normalizeCoachEndurancePrescription({
      prescription: { blocks: [{ steps: [{ kind: 'interval', effort: 'TEMPO' }] }] },
      type: 'RUN',
      intensity: 'TEMPO',
    });

    const [block] = prescription?.blocks ?? [];
    expect(block?.kind === 'step' && block.step.duration).toEqual({ type: 'lap' });
  });

  it('returns null for a strength session or an empty structure', () => {
    expect(
      normalizeCoachEndurancePrescription({ prescription: INTERVALS, type: 'STRENGTH' }),
    ).toBeNull();
    expect(
      normalizeCoachEndurancePrescription({ prescription: { blocks: [] }, type: 'RUN' }),
    ).toBeNull();
  });
});

describe('formatEndurancePrescriptionSummary', () => {
  it('renders the structure the way the athlete reads it', () => {
    const prescription = normalizeCoachEndurancePrescription({
      prescription: INTERVALS,
      type: 'RUN',
      intensity: 'THRESHOLD',
    });

    expect(formatEndurancePrescriptionSummary(prescription!)).toBe(
      '20 min échauffement · 6× (1 km bloc + 2 min récup) · 10 min retour au calme',
    );
  });
});

describe('resolveEnduranceFieldsForPersist', () => {
  it('overrides the prose with the structure when one exists', () => {
    const resolved = resolveEnduranceFieldsForPersist({
      type: 'RUN',
      description: 'Séance clé de la semaine',
      intensity: 'THRESHOLD',
      endurancePrescription: INTERVALS,
    });

    expect(resolved.endurancePrescription).not.toBeNull();
    expect(resolved.description).toBe(
      '20 min échauffement · 6× (1 km bloc + 2 min récup) · 10 min retour au calme',
    );
  });

  it('leaves an unstructured session its prose', () => {
    const resolved = resolveEnduranceFieldsForPersist({
      type: 'RUN',
      description: 'Sortie souple 45 min',
      intensity: 'ENDURANCE',
      endurancePrescription: null,
    });

    expect(resolved.endurancePrescription).toBeNull();
    expect(resolved.description).toBe('Sortie souple 45 min');
  });

  it('passes an already-stored prescription through untouched', () => {
    const stored = normalizeCoachEndurancePrescription({
      prescription: INTERVALS,
      type: 'RUN',
      intensity: 'THRESHOLD',
    });

    const resolved = resolveEnduranceFieldsForPersist({
      type: 'RUN',
      intensity: 'THRESHOLD',
      endurancePrescription: stored,
    });

    expect(resolved.endurancePrescription).toEqual(stored);
  });
});

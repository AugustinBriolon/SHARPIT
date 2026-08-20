import { describe, expect, it } from 'vitest';
import { STEP_MIN_SECONDS } from '@/lib/planned-session/endurance/endurance-prescription';
import { effectiveEndurancePrescription } from '@/lib/planned-session/endurance/endurance-session';
import { garminPushStaleness } from '@/lib/planned-session/endurance/endurance-staleness';
import type { AthleteThresholds } from '@/lib/planned-session/endurance/endurance-targets';

const THRESHOLDS: AthleteThresholds = {
  runThresholdPaceSecPerKm: 240,
  ftpW: 250,
  lthr: 165,
  maxHr: 190,
};

describe('effectiveEndurancePrescription', () => {
  it('derives a single timed step from duration and intensity', () => {
    const { prescription, derived } = effectiveEndurancePrescription({
      sport: 'RUN',
      durationMin: 50,
      intensity: 'ENDURANCE',
      stored: null,
      thresholds: THRESHOLDS,
    });

    expect(derived).toBe(true);
    expect(prescription.blocks).toHaveLength(1);
    expect(prescription.blocks[0]).toMatchObject({
      kind: 'step',
      step: { duration: { type: 'time', seconds: 3000 }, target: { metric: 'pace' } },
    });
  });

  it('falls back to the default duration when the session carries none or zero', () => {
    for (const durationMin of [null, 0, -10]) {
      const { prescription } = effectiveEndurancePrescription({
        sport: 'RUN',
        durationMin,
        intensity: 'ENDURANCE',
        stored: null,
        thresholds: THRESHOLDS,
      });
      const [block] = prescription.blocks;
      expect(block.kind === 'step' && block.step.duration).toEqual({
        type: 'time',
        seconds: 45 * 60,
      });
    }
  });

  it('never emits a step shorter than the schema allows', () => {
    const { prescription } = effectiveEndurancePrescription({
      sport: 'RUN',
      durationMin: 0.01,
      intensity: 'ENDURANCE',
      stored: null,
      thresholds: THRESHOLDS,
    });
    const [block] = prescription.blocks;
    expect(block.kind === 'step' && block.step.duration).toEqual({
      type: 'time',
      seconds: STEP_MIN_SECONDS,
    });
  });

  it('does not invent a target for a sport with no validated table', () => {
    const { prescription, warnings } = effectiveEndurancePrescription({
      sport: 'SWIM',
      durationMin: 60,
      intensity: 'TEMPO',
      stored: null,
      thresholds: THRESHOLDS,
    });

    const [block] = prescription.blocks;
    expect(block.kind === 'step' && block.step.target).toEqual({ metric: 'none' });
    expect(warnings.join(' ')).toMatch(/pas de table de cibles/i);
  });

  it('derives a power band for a bike session, and none without an FTP', () => {
    const withFtp = effectiveEndurancePrescription({
      sport: 'BIKE',
      durationMin: 60,
      intensity: 'TEMPO',
      stored: null,
      thresholds: THRESHOLDS,
    });
    const [powered] = withFtp.prescription.blocks;
    expect(powered.kind === 'step' && powered.step.target).toMatchObject({ metric: 'power' });

    const withoutFtp = effectiveEndurancePrescription({
      sport: 'BIKE',
      durationMin: 60,
      intensity: 'TEMPO',
      stored: null,
      thresholds: { ...THRESHOLDS, ftpW: null },
    });
    const [free] = withoutFtp.prescription.blocks;
    expect(free.kind === 'step' && free.step.target).toEqual({ metric: 'none' });
    expect(withoutFtp.warnings.join(' ')).toMatch(/ftp inconnue/i);
  });

  it('forces the stored prescription onto the session sport', () => {
    const { prescription, derived } = effectiveEndurancePrescription({
      sport: 'BIKE',
      durationMin: 60,
      intensity: 'TEMPO',
      stored: {
        version: 1,
        sport: 'RUN',
        blocks: [
          {
            kind: 'step',
            step: {
              kind: 'interval',
              duration: { type: 'time', seconds: 600 },
              target: { metric: 'none' },
            },
          },
        ],
      },
      thresholds: THRESHOLDS,
    });

    expect(derived).toBe(false);
    expect(prescription.sport).toBe('BIKE');
  });
});

describe('staleness of a derived session', () => {
  it('flags a session pushed before the threshold pace moved', () => {
    const { prescription } = effectiveEndurancePrescription({
      sport: 'RUN',
      durationMin: 50,
      intensity: 'ENDURANCE',
      stored: null,
      thresholds: THRESHOLDS,
    });

    const result = garminPushStaleness({
      prescription,
      pushedThresholds: { ...THRESHOLDS, runThresholdPaceSecPerKm: 250 },
      currentThresholds: THRESHOLDS,
      hasPush: true,
    });

    expect(result.stale).toBe(true);
    expect(result.changed).toEqual([{ key: 'runThresholdPaceSecPerKm', from: 250, to: 240 }]);
  });

  it('ignores a reference the session does not use', () => {
    const { prescription } = effectiveEndurancePrescription({
      sport: 'RUN',
      durationMin: 50,
      intensity: 'ENDURANCE',
      stored: null,
      thresholds: THRESHOLDS,
    });

    const result = garminPushStaleness({
      prescription,
      pushedThresholds: { ...THRESHOLDS, ftpW: 200 },
      currentThresholds: THRESHOLDS,
      hasPush: true,
    });

    expect(result.stale).toBe(false);
  });
});

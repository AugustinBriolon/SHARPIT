import { describe, expect, it } from 'vitest';
import {
  defaultHrTargetForIntensity,
  defaultTargetForIntensity,
  formatPace,
  formatPaceBand,
  intensityFromTarget,
  resolveEnduranceTarget,
  type AthleteThresholds,
} from '@/lib/planned-session/endurance/endurance-targets';

/** Threshold pace 4:00/km — every expectation below is derived from it. */
const THRESHOLDS: AthleteThresholds = {
  runThresholdPaceSecPerKm: 240,
  swimCssSecPer100m: 100,
  ftpW: 250,
  lthr: 165,
  maxHr: 190,
};

const NO_THRESHOLDS: AthleteThresholds = {
  runThresholdPaceSecPerKm: null,
  swimCssSecPer100m: null,
  ftpW: null,
  lthr: null,
  maxHr: null,
};

describe('defaultTargetForIntensity', () => {
  it('centres a quality band on the anchor with a ±2.5 % half-band', () => {
    const { target } = defaultTargetForIntensity('RUN', 'THRESHOLD');
    expect(target).toMatchObject({ metric: 'pace', pctMin: 97.5, pctMax: 102.5 });
  });

  it('widens an easy band rather than leaving its slow bound open', () => {
    const { target } = defaultTargetForIntensity('RUN', 'ENDURANCE');
    // Connect displays both bounds, so the slow one has to be a pace, not a floor.
    expect(target).toMatchObject({ pctMin: 72.5, pctMax: 87.5 });
  });

  it('falls back to threshold for RACE and says so', () => {
    const { target, warnings } = defaultTargetForIntensity('RUN', 'RACE');
    expect(target).toMatchObject({ pctMin: 97.5, pctMax: 102.5 });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('RACE');
  });

  it('anchors a bike band on FTP', () => {
    expect(defaultTargetForIntensity('BIKE', 'THRESHOLD').target).toMatchObject({
      metric: 'power',
      pctMin: 95.5,
      pctMax: 100.5,
    });
  });

  it('anchors a swim band on CSS, compressed against the running spread', () => {
    expect(defaultTargetForIntensity('SWIM', 'THRESHOLD').target).toMatchObject({
      metric: 'pace',
      pctMin: 97.5,
      pctMax: 102.5,
    });
    // Easy swimming sits far closer to threshold than easy running does.
    expect(defaultTargetForIntensity('SWIM', 'ENDURANCE').target.pctMax).toBe(97.5);
    expect(defaultTargetForIntensity('RUN', 'ENDURANCE').target.pctMax).toBe(87.5);
  });
});

describe('resolveEnduranceTarget — pace', () => {
  it('resolves a threshold band to 3:54–4:06 at a 4:00/km threshold', () => {
    const { target } = defaultTargetForIntensity('RUN', 'THRESHOLD');
    const { resolved } = resolveEnduranceTarget(target, THRESHOLDS, 'RUN');

    expect(resolved).toMatchObject({ metric: 'pace', paceSecFast: 234, paceSecSlow: 246 });
    expect(formatPaceBand(234, 246)).toBe('3:54–4:06/km');
  });

  it('keeps the speed range ascending, the order Garmin expects', () => {
    const { target } = defaultTargetForIntensity('RUN', 'THRESHOLD');
    const { resolved } = resolveEnduranceTarget(target, THRESHOLDS, 'RUN');
    if (resolved.metric !== 'pace') {
      throw new Error('expected a pace target');
    }

    expect(resolved.speedMsMin).toBeLessThan(resolved.speedMsMax);
    // Speed comes from the unrounded pace (240 / 0.975 = 246.15 s/km), not the
    // rounded value shown to the athlete — the watch gets the precise band.
    expect(resolved.speedMsMin).toBeCloseTo(4.0625, 4);
    expect(resolved.speedMsMax).toBeCloseTo(4.2708, 4);
  });

  it('keeps an easy band readable on the watch', () => {
    const { target } = defaultTargetForIntensity('RUN', 'RECOVERY');
    const { resolved } = resolveEnduranceTarget(target, THRESHOLDS, 'RUN');
    if (resolved.metric !== 'pace') {
      throw new Error('expected a pace target');
    }

    // 4:00/km threshold, recovery centred on 68 % of speed, ±7.5 %.
    expect(resolved.paceSecFast).toBe(318); // 5:18/km
    expect(resolved.paceSecSlow).toBe(397); // 6:37/km — a pace, not a placeholder
  });

  it('lets an absolute override win over the relative band', () => {
    const { resolved } = resolveEnduranceTarget(
      { metric: 'pace', pctMin: 97.5, pctMax: 102.5, absEasy: 250, absHard: 240 },
      THRESHOLDS,
      'RUN',
    );
    expect(resolved).toMatchObject({ paceSecFast: 240, paceSecSlow: 250 });
  });

  it('corrects an override given the wrong way round', () => {
    const { resolved } = resolveEnduranceTarget(
      { metric: 'pace', absEasy: 240, absHard: 250 },
      THRESHOLDS,
      'RUN',
    );
    expect(resolved).toMatchObject({ paceSecFast: 240, paceSecSlow: 250 });
  });

  it('drops the target and warns when no threshold pace is known', () => {
    const { target } = defaultTargetForIntensity('RUN', 'THRESHOLD');
    const { resolved, warnings } = resolveEnduranceTarget(target, NO_THRESHOLDS, 'RUN');

    expect(resolved).toEqual({ metric: 'none' });
    expect(warnings[0]).toContain('Allure seuil inconnue');
  });
});

describe('resolveEnduranceTarget — heart rate', () => {
  it('anchors on LTHR by default', () => {
    const { resolved } = resolveEnduranceTarget(
      defaultHrTargetForIntensity('THRESHOLD'),
      THRESHOLDS,
      'RUN',
    );
    expect(resolved).toEqual({ metric: 'hr', bpmMin: 161, bpmMax: 169 });
  });

  it('falls back to max HR when LTHR is missing', () => {
    const { resolved } = resolveEnduranceTarget(
      { metric: 'hr', hrRef: 'auto', pctMin: 90, pctMax: 100 },
      { ...NO_THRESHOLDS, maxHr: 190 },
      'RUN',
    );
    expect(resolved).toEqual({ metric: 'hr', bpmMin: 171, bpmMax: 190 });
  });

  it('warns when neither reference exists', () => {
    const { resolved, warnings } = resolveEnduranceTarget(
      { metric: 'hr', pctMin: 90, pctMax: 100 },
      NO_THRESHOLDS,
      'RUN',
    );
    expect(resolved).toEqual({ metric: 'none' });
    expect(warnings[0]).toContain('FC seuil');
  });
});

describe('resolveEnduranceTarget — power', () => {
  it('resolves a band as a percentage of FTP', () => {
    const { resolved } = resolveEnduranceTarget(
      { metric: 'power', pctMin: 95, pctMax: 105 },
      THRESHOLDS,
      'RUN',
    );
    expect(resolved).toEqual({ metric: 'power', wattsMin: 238, wattsMax: 263 });
  });

  it('warns when FTP is missing', () => {
    const { resolved, warnings } = resolveEnduranceTarget(
      { metric: 'power', pctMin: 95, pctMax: 105 },
      NO_THRESHOLDS,
      'RUN',
    );
    expect(resolved).toEqual({ metric: 'none' });
    expect(warnings[0]).toContain('FTP inconnue');
  });
});

describe('formatPace', () => {
  it('pads seconds', () => {
    expect(formatPace(245)).toBe('4:05');
    expect(formatPace(240)).toBe('4:00');
  });
});

describe('absolute overrides', () => {
  it('keeps a single-sided override and derives the other bound', () => {
    // "No faster than 3:40" on a threshold band: the hard side is pinned, the easy
    // side still comes from the athlete's threshold pace.
    const { resolved, warnings } = resolveEnduranceTarget(
      { metric: 'pace', pctMin: 97.5, pctMax: 102.5, absHard: 220 },
      THRESHOLDS,
      'RUN',
    );
    expect(resolved).toMatchObject({ metric: 'pace', paceSecFast: 220, paceSecSlow: 246 });
    expect(warnings).toEqual([]);
  });

  it('warns instead of silently dropping a target it cannot complete', () => {
    const { resolved, warnings } = resolveEnduranceTarget(
      { metric: 'pace', absHard: 220 },
      THRESHOLDS,
      'RUN',
    );
    expect(resolved).toEqual({ metric: 'none' });
    expect(warnings.join(' ')).toMatch(/sans guidage/i);
  });

  it('warns on a cadence target missing a bound', () => {
    const { resolved, warnings } = resolveEnduranceTarget(
      { metric: 'cadence', absEasy: 85 },
      THRESHOLDS,
      'RUN',
    );
    expect(resolved).toEqual({ metric: 'none' });
    expect(warnings.join(' ')).toMatch(/sans guidage/i);
  });

  it('refuses a pace bound that would divide by zero', () => {
    const { resolved, warnings } = resolveEnduranceTarget(
      { metric: 'pace', absEasy: 0, absHard: 0 },
      THRESHOLDS,
      'RUN',
    );
    expect(resolved).toEqual({ metric: 'none' });
    expect(warnings.length).toBeGreaterThan(0);
  });
});

describe('resolveEnduranceTarget — swimming', () => {
  it('reads per 100 m, not per kilometre', () => {
    const { target } = defaultTargetForIntensity('SWIM', 'THRESHOLD');
    const { resolved } = resolveEnduranceTarget(target, THRESHOLDS, 'SWIM');
    if (resolved.metric !== 'pace') {
      throw new Error('expected a pace target');
    }

    expect(resolved.paceUnit).toBe('100m');
    // CSS 100 s/100 m, band 97.5–102.5 % of speed.
    expect(resolved.paceSecFast).toBe(98);
    expect(resolved.paceSecSlow).toBe(103);
    expect(formatPaceBand(resolved.paceSecFast, resolved.paceSecSlow, resolved.paceUnit)).toBe(
      '1:38–1:43/100m',
    );
  });

  it('converts to m/s over 100 m, so the speed stays swimmer-sized', () => {
    const { target } = defaultTargetForIntensity('SWIM', 'THRESHOLD');
    const { resolved } = resolveEnduranceTarget(target, THRESHOLDS, 'SWIM');
    if (resolved.metric !== 'pace') {
      throw new Error('expected a pace target');
    }

    expect(resolved.speedMsMin).toBeLessThan(resolved.speedMsMax);
    expect(resolved.speedMsMin).toBeCloseTo(0.975, 3);
    expect(resolved.speedMsMax).toBeCloseTo(1.025, 3);
  });

  it('anchors on CSS, never on the running threshold', () => {
    const { target } = defaultTargetForIntensity('SWIM', 'THRESHOLD');
    const { resolved, warnings } = resolveEnduranceTarget(
      target,
      { ...THRESHOLDS, swimCssSecPer100m: null },
      'SWIM',
    );

    expect(resolved).toEqual({ metric: 'none' });
    expect(warnings[0]).toContain('CSS');
  });
});

describe('intensityFromTarget', () => {
  it('reads back every band it produced', () => {
    for (const intensity of ['RECOVERY', 'ENDURANCE', 'TEMPO', 'THRESHOLD', 'VO2MAX'] as const) {
      for (const sport of ['RUN', 'SWIM', 'BIKE'] as const) {
        const { target } = defaultTargetForIntensity(sport, intensity);
        expect(intensityFromTarget(sport, target), `${sport}/${intensity}`).toBe(intensity);
      }
    }
  });

  it('needs the sport, because the tables collide', () => {
    const { target } = defaultTargetForIntensity('RUN', 'TEMPO');
    // 90 % of threshold speed is a runner's tempo and a swimmer's endurance —
    // water compresses the range. Read against the wrong table it answers, and
    // answers wrong, so the caller must pass the prescription's own sport.
    expect(intensityFromTarget('RUN', target)).toBe('TEMPO');
    expect(intensityFromTarget('SWIM', target)).toBe('ENDURANCE');
  });

  it('gives up on a band no table produced', () => {
    expect(intensityFromTarget('RUN', { metric: 'pace', pctMin: 71, pctMax: 74 })).toBeNull();
    expect(intensityFromTarget('RUN', { metric: 'none' })).toBeNull();
    expect(intensityFromTarget('RUN', { metric: 'pace', absEasy: 300, absHard: 320 })).toBeNull();
  });
});

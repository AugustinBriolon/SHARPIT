import { describe, expect, it } from 'vitest';
import {
  bodyFatNorm,
  hrvNorm,
  respirationNorm,
  restingHrNorm,
  sleepNorm,
  stepsNorm,
  visceralFatNorm,
  vo2maxNorm,
} from './health-norms';

describe('health norms', () => {
  it('reads a resting HR from athlete to high, naming its source', () => {
    expect(restingHrNorm(46)).toMatchObject({ band: 'athlete', tone: 'good' });
    expect(restingHrNorm(58).band).toBe('low');
    expect(restingHrNorm(72)).toMatchObject({ band: 'normal', tone: 'neutral' });
    expect(restingHrNorm(104)).toMatchObject({ band: 'high', tone: 'watch' });
    expect(restingHrNorm(58).reference).toContain('AHA');
  });

  it('holds sleep to the 7–9 h recommendation', () => {
    expect(sleepNorm(330)).toMatchObject({ band: 'short', tone: 'watch' });
    expect(sleepNorm(400).band).toBe('slightly-short');
    expect(sleepNorm(450)).toMatchObject({ band: 'recommended', tone: 'good' });
    expect(sleepNorm(560).band).toBe('long');
  });

  it('places a VO₂max against the HUNT3 mean for age and sex', () => {
    // Men at 35: mean 49.
    expect(vo2maxNorm(60, 35, 'male')).toMatchObject({ band: 'well-above', tone: 'good' });
    expect(vo2maxNorm(49, 35, 'male').band).toBe('average');
    expect(vo2maxNorm(40, 35, 'male')).toMatchObject({ band: 'below', tone: 'watch' });
    expect(vo2maxNorm(49, 35, 'male').reference).toContain('49 mL/kg/min');
  });

  it('reads body fat by sex, and visceral fat on the scale index', () => {
    expect(bodyFatNorm(12, 'male').band).toBe('athlete');
    expect(bodyFatNorm(12, 'female')).toMatchObject({ band: 'essential', tone: 'watch' });
    expect(bodyFatNorm(28, 'female').band).toBe('average');
    expect(visceralFatNorm(8).tone).toBe('good');
    expect(visceralFatNorm(14).tone).toBe('watch');
  });

  it('asks fewer steps after 60, and reads breathing and HRV', () => {
    expect(stepsNorm(7_000, 35).band).toBe('moderate');
    expect(stepsNorm(7_000, 65).band).toBe('active');
    expect(respirationNorm(14).tone).toBe('good');
    expect(respirationNorm(23).tone).toBe('watch');
    expect(hrvNorm(40, { low: 45, high: 70 })).toMatchObject({ band: 'below', tone: 'watch' });
    expect(hrvNorm(55, { low: 45, high: 70 }).band).toBe('within');
  });
});

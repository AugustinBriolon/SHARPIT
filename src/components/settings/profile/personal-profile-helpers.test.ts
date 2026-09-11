import { describe, expect, it } from 'vitest';
import { personalProfileBaseline, validatePersonalProfileFields } from './personal-profile-helpers';

const EMPTY = { heightCm: '', targetWeightKg: '', birthDate: '', sleepHours: '', sleepBedtime: '' };

describe('personal profile — weight target', () => {
  it('stays optional', () => {
    expect(validatePersonalProfileFields(EMPTY)).toEqual({});
  });

  it('rejects an implausible target', () => {
    expect(
      validatePersonalProfileFields({ ...EMPTY, targetWeightKg: '12' }).targetWeightKg,
    ).toMatch(/entre 30 et 250 kg/);
    expect(validatePersonalProfileFields({ ...EMPTY, targetWeightKg: '72.5' })).toEqual({});
  });

  it('prefills the field from the stored profile', () => {
    const baseline = personalProfileBaseline({
      heightCm: 180,
      targetWeightKg: 72.5,
      birthDate: null,
      ftpW: null,
      maxHr: null,
      lthr: null,
      runThresholdPaceSecPerKm: null,
      swimCssSecPer100m: null,
      defaultPoolLengthM: null,
      vo2maxRunning: null,
      vo2maxCycling: null,
      thresholdsSyncedAt: null,
      sleepTargetMinutes: null,
      sleepBedtimeTargetMin: null,
    });
    expect(baseline).toMatchObject({ heightCm: '180', targetWeightKg: '72.5' });
    expect(personalProfileBaseline(null).targetWeightKg).toBe('');
  });
});

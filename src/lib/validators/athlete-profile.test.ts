import { describe, expect, it } from 'vitest';
import { athleteProfileSchema } from './athlete-profile';

/**
 * A PATCH must touch only what it carries.
 *
 * The schema preprocessed missing keys into `null`, so `.partial()` could not
 * drop them and the upsert wrote every field on every save — a one-field edit
 * cleared the rest of the profile.
 */
describe('athleteProfileSchema', () => {
  it('keeps a one-field patch to one field', () => {
    const parsed = athleteProfileSchema.parse({ ftpW: 215 });

    expect(parsed).toEqual({ ftpW: 215 });
    expect(Object.keys(parsed)).toEqual(['ftpW']);
  });

  it('never invents a key the caller did not send', () => {
    const parsed = athleteProfileSchema.parse({ swimCssSecPer100m: 103 });

    for (const key of ['ftpW', 'maxHr', 'lthr', 'heightCm', 'sleepTargetMinutes']) {
      expect(key in parsed, `${key} must stay out of the patch`).toBe(false);
    }
  });

  it('still lets a field be cleared on purpose', () => {
    expect(athleteProfileSchema.parse({ ftpW: null })).toEqual({ ftpW: null });
    // An empty input is the athlete emptying the box, which is also a clear.
    expect(athleteProfileSchema.parse({ ftpW: '' })).toEqual({ ftpW: null });
  });

  it('still coerces and validates the values it does carry', () => {
    expect(athleteProfileSchema.parse({ maxHr: '193' })).toEqual({ maxHr: 193 });
    expect(() => athleteProfileSchema.parse({ heightCm: 40 })).toThrow();
    expect(() => athleteProfileSchema.parse({ defaultPoolLengthM: 5 })).toThrow();
  });

  it('carries a birth date without dragging the rest along', () => {
    const parsed = athleteProfileSchema.parse({ birthDate: '1990-04-12' });

    expect(Object.keys(parsed)).toEqual(['birthDate']);
    expect(parsed.birthDate).toBeInstanceOf(Date);
  });

  it('refuses a patch that carries nothing at all', () => {
    expect(() => athleteProfileSchema.parse({})).toThrow();
  });

  it('carries the reading density on its own', () => {
    expect(athleteProfileSchema.parse({ displayMode: 'expert' })).toEqual({
      displayMode: 'expert',
    });
    expect(athleteProfileSchema.parse({ displayMode: 'essential' })).toEqual({
      displayMode: 'essential',
    });
  });

  it('refuses a density it does not know — the column is never nullable', () => {
    expect(() => athleteProfileSchema.parse({ displayMode: 'advanced' })).toThrow();
    expect(() => athleteProfileSchema.parse({ displayMode: null })).toThrow();
  });

  it('carries practiced sports on their own', () => {
    expect(
      athleteProfileSchema.parse({
        practicedSports: { version: 1, sports: ['run', 'strength'] },
      }),
    ).toEqual({
      practicedSports: { version: 1, sports: ['run', 'strength'] },
    });
  });

  it('refuses unknown practiced sport ids', () => {
    expect(() =>
      athleteProfileSchema.parse({
        practicedSports: { version: 1, sports: ['hike'] },
      }),
    ).toThrow();
  });
});

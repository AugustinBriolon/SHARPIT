import { describe, expect, it } from 'vitest';
import { changedProfileFields } from './profile-patch';

describe('changedProfileFields', () => {
  it('sends only what moved', () => {
    expect(
      changedProfileFields(
        { heightCm: 178, birthDate: '1990-01-01' },
        { heightCm: 180, birthDate: '1990-01-01' },
      ),
    ).toEqual({ heightCm: 180 });
  });

  it('keeps an untouched field out of the payload, even when it is null', () => {
    const patch = changedProfileFields(
      { heightCm: null, sleepTargetMinutes: 480 },
      { heightCm: null, sleepTargetMinutes: 500 },
    );
    expect(patch).toEqual({ sleepTargetMinutes: 500 });
    expect('heightCm' in patch).toBe(false);
  });

  it('still lets a field be cleared on purpose', () => {
    expect(changedProfileFields({ heightCm: 178 }, { heightCm: null })).toEqual({ heightCm: null });
  });

  it('returns nothing when nothing changed', () => {
    expect(changedProfileFields({ a: 1, b: null }, { a: 1, b: null })).toEqual({});
  });

  it('treats a value appearing for the first time as a change', () => {
    expect(changedProfileFields({ ftpW: null }, { ftpW: 220 })).toEqual({ ftpW: 220 });
  });
});

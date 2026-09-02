import { describe, expect, it } from 'vitest';
import { DEMO_IDENTITY, initialsFromName, shortLabelFromName } from '@/lib/auth/athlete-identity';

describe('initialsFromName', () => {
  it('uses first and last name', () => {
    expect(initialsFromName({ firstName: 'Augustin', lastName: 'Briolon' })).toBe('AB');
  });

  it('uppercases with French locale', () => {
    expect(initialsFromName({ firstName: 'édouard', lastName: 'martin' })).toBe('ÉM');
  });

  it('falls back to a single initial when only first name exists', () => {
    expect(initialsFromName({ firstName: 'Augustin' })).toBe('A');
  });

  it('parses fullName when first/last are missing', () => {
    expect(initialsFromName({ fullName: 'Augustin Briolon' })).toBe('AB');
    expect(initialsFromName({ fullName: 'Madonna' })).toBe('M');
  });

  it('returns ? when nothing is usable', () => {
    expect(initialsFromName({})).toBe('?');
    expect(initialsFromName({ firstName: '  ', lastName: null, fullName: '' })).toBe('?');
  });
});

describe('shortLabelFromName', () => {
  it('prefers first name', () => {
    expect(shortLabelFromName({ firstName: 'Augustin', fullName: 'Augustin Briolon' })).toBe(
      'Augustin',
    );
  });

  it('uses the first word of fullName', () => {
    expect(shortLabelFromName({ fullName: 'Augustin Briolon' })).toBe('Augustin');
  });

  it('falls back to Profil', () => {
    expect(shortLabelFromName({})).toBe('Profil');
  });
});

describe('DEMO_IDENTITY', () => {
  it('exposes demo initials and keeps Shell V1 Moi tab label', () => {
    expect(DEMO_IDENTITY.initials).toBe('D');
    expect(DEMO_IDENTITY.shortLabel).toBe('Moi');
  });
});

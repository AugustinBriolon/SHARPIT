import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readSignedToken, signToken } from './signed-token';

const inOneMinute = () => Math.floor(Date.now() / 1000) + 60;

describe('signed token', () => {
  beforeEach(() => {
    vi.stubEnv('SECRET_ENCRYPTION_KEY', 'test-key');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads back what it signed', () => {
    const token = signToken({ exp: inOneMinute(), athleteId: 'ath-1' });
    expect(readSignedToken(token)).toMatchObject({ athleteId: 'ath-1' });
  });

  it('refuses a tampered payload', () => {
    const [, signature] = signToken({ exp: inOneMinute(), athleteId: 'ath-1' }).split('.');
    const forged = Buffer.from(JSON.stringify({ exp: inOneMinute(), athleteId: 'ath-2' }));
    expect(readSignedToken(`${forged.toString('base64url')}.${signature}`)).toBeNull();
  });

  it('refuses a token signed with another key', () => {
    const token = signToken({ exp: inOneMinute() });
    vi.stubEnv('SECRET_ENCRYPTION_KEY', 'other-key');
    expect(readSignedToken(token)).toBeNull();
  });

  it('refuses an expired token', () => {
    expect(readSignedToken(signToken({ exp: Math.floor(Date.now() / 1000) - 1 }))).toBeNull();
  });

  it('refuses garbage', () => {
    for (const raw of [null, undefined, '', 'abc', 'a.b.c', 'bm90LWpzb24.sig']) {
      expect(readSignedToken(raw)).toBeNull();
    }
  });

  it('refuses to sign in production without a key', () => {
    vi.stubEnv('SECRET_ENCRYPTION_KEY', '');
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => signToken({ exp: inOneMinute() })).toThrow(/SECRET_ENCRYPTION_KEY/);
  });
});

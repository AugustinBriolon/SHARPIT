import { afterEach, describe, expect, it } from 'vitest';
import { encryptSecret } from '@/lib/secret-box';
import {
  GARMIN_CONNECTION_SELECT,
  MFP_CONNECTION_SELECT,
  OAUTH_CONNECTION_SELECT,
  RENPHO_CONNECTION_SELECT,
  isGarminAccountConnected,
  isMfpAccountConnected,
  isOAuthAccountConnected,
  isRenphoAccountConnected,
} from './connection-status';

/**
 * The trap these guard against: a caller selects fewer columns than the predicate
 * reads, the missing one is `undefined`, `undefined != null` is false, and the
 * account reports disconnected with no error raised anywhere. That happened to
 * every provider at once and silently disabled sync across the app.
 */
const CASES = [
  {
    name: 'oauth',
    select: OAUTH_CONNECTION_SELECT,
    check: isOAuthAccountConnected,
    fillValid: (row: Record<string, unknown>) => {
      row.accessTokenEnc = encryptSecret('access');
      row.refreshTokenEnc = encryptSecret('refresh');
    },
  },
  {
    name: 'garmin',
    select: GARMIN_CONNECTION_SELECT,
    check: isGarminAccountConnected,
    fillValid: (row: Record<string, unknown>) => {
      row.oauth1TokenEnc = encryptSecret(
        JSON.stringify({ oauth_token: 't', oauth_token_secret: 's' }),
      );
      row.oauth2TokenEnc = encryptSecret(JSON.stringify({ access_token: 'a', refresh_token: 'r' }));
    },
  },
  {
    name: 'renpho',
    select: RENPHO_CONNECTION_SELECT,
    check: isRenphoAccountConnected,
    fillValid: (row: Record<string, unknown>) => {
      row.email = 'athlete@example.com';
      row.passwordEnc = encryptSecret('password');
    },
  },
  {
    name: 'mfp',
    select: MFP_CONNECTION_SELECT,
    check: isMfpAccountConnected,
    fillValid: (row: Record<string, unknown>) => {
      row.sessionTokenEnc = encryptSecret('session-cookie');
    },
  },
] as const;

function emptyRow(select: Record<string, true>): Record<string, unknown> {
  return Object.fromEntries(Object.keys(select).map((key) => [key, undefined]));
}

function rowFrom(select: Record<string, true>, value: unknown): Record<string, unknown> {
  return Object.fromEntries(Object.keys(select).map((key) => [key, value]));
}

const ORIGINAL_KEY = process.env.SECRET_ENCRYPTION_KEY;

afterEach(() => {
  if (ORIGINAL_KEY === undefined) {
    delete process.env.SECRET_ENCRYPTION_KEY;
  } else {
    process.env.SECRET_ENCRYPTION_KEY = ORIGINAL_KEY;
  }
});

describe.each(CASES)('$name connection select', ({ select, check, fillValid }) => {
  it('carries every column its predicate reads', () => {
    process.env.SECRET_ENCRYPTION_KEY = 'connection-status-test-key';
    const row = emptyRow(select);
    fillValid(row);
    expect(check(row)).toBe(true);
  });

  it('reports disconnected when any one of them is missing', () => {
    process.env.SECRET_ENCRYPTION_KEY = 'connection-status-test-key';
    const keys = Object.keys(select);
    for (const omitted of keys) {
      const partial = emptyRow(select);
      fillValid(partial);
      delete partial[omitted];
      expect(check(partial), `missing ${omitted} must not read as connected`).toBe(false);
    }
  });

  it('reports disconnected on a null credential, not just an absent one', () => {
    expect(check(rowFrom(select, null))).toBe(false);
  });

  it('reports disconnected without an account at all', () => {
    expect(check(null)).toBe(false);
    expect(check(undefined)).toBe(false);
  });

  it('reports disconnected for short placeholder ciphertext (e.g. demo)', () => {
    expect(check(rowFrom(select, 'demo'))).toBe(false);
    expect(check(rowFrom(select, 'x'))).toBe(false);
  });
});

function encryptDiGarminAccount() {
  process.env.SECRET_ENCRYPTION_KEY = 'connection-status-test-key';
  return {
    oauth1TokenEnc: encryptSecret(
      JSON.stringify({
        oauth_token: '__DI__:GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2',
        oauth_token_secret: 'refresh-token',
      }),
    ),
    oauth2TokenEnc: encryptSecret(
      JSON.stringify({
        access_token: 'di-access',
        refresh_token: 'refresh-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'Bearer',
      }),
    ),
  };
}

describe('isGarminAccountConnected (hub + cron agreement)', () => {
  it('is connected for DI OAuth2 tokens stored in oauth1/oauth2 secret-box columns', () => {
    expect(isGarminAccountConnected(encryptDiGarminAccount())).toBe(true);
  });

  it('is connected for leftover-but-still-valid legacy Garth token shape', () => {
    process.env.SECRET_ENCRYPTION_KEY = 'connection-status-test-key';
    expect(
      isGarminAccountConnected({
        oauth1TokenEnc: encryptSecret(
          JSON.stringify({ oauth_token: 'oa1', oauth_token_secret: 'sec' }),
        ),
        oauth2TokenEnc: encryptSecret(
          JSON.stringify({
            access_token: 'legacy-access',
            refresh_token: 'legacy-rt',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          }),
        ),
      }),
    ).toBe(true);
  });

  it('is disconnected for revoked empty enc (hub shows reconnect / not connected)', () => {
    expect(isGarminAccountConnected({ oauth1TokenEnc: '', oauth2TokenEnc: '' })).toBe(false);
  });

  it('is disconnected for malformed/demo blobs that are not live credentials', () => {
    expect(isGarminAccountConnected({ oauth1TokenEnc: 'demo', oauth2TokenEnc: 'demo' })).toBe(
      false,
    );
  });

  it('is disconnected for ciphertext-looking blobs that are not Garmin token JSON', () => {
    process.env.SECRET_ENCRYPTION_KEY = 'connection-status-test-key';
    const junk = encryptSecret('not-garmin-tokens');
    expect(isGarminAccountConnected({ oauth1TokenEnc: junk, oauth2TokenEnc: junk })).toBe(false);
  });

  it('is disconnected when only one of the oauth enc columns is present (leftover partial row)', () => {
    process.env.SECRET_ENCRYPTION_KEY = 'connection-status-test-key';
    const di = encryptDiGarminAccount();
    expect(
      isGarminAccountConnected({ oauth1TokenEnc: di.oauth1TokenEnc, oauth2TokenEnc: '' }),
    ).toBe(false);
    expect(
      isGarminAccountConnected({ oauth1TokenEnc: '', oauth2TokenEnc: di.oauth2TokenEnc }),
    ).toBe(false);
  });

  it('still reports connected on AES-GCM authenticity failure so cron can circuit-break', () => {
    process.env.SECRET_ENCRYPTION_KEY = 'key-a';
    const blob = encryptSecret(JSON.stringify({ oauth_token: 't', oauth_token_secret: 's' }));
    const blob2 = encryptSecret(JSON.stringify({ access_token: 'a', refresh_token: 'r' }));
    process.env.SECRET_ENCRYPTION_KEY = 'key-b';
    expect(isGarminAccountConnected({ oauth1TokenEnc: blob, oauth2TokenEnc: blob2 })).toBe(true);
  });
});

describe('isMfpAccountConnected (hub + cron agreement)', () => {
  it('is disconnected with no row', () => {
    expect(isMfpAccountConnected(null)).toBe(false);
  });

  it('is disconnected for revoked empty enc', () => {
    expect(isMfpAccountConnected({ sessionTokenEnc: '' })).toBe(false);
  });

  it('is disconnected for malformed/demo blobs', () => {
    expect(isMfpAccountConnected({ sessionTokenEnc: 'demo' })).toBe(false);
  });

  it('is connected for a live encrypted session cookie', () => {
    process.env.SECRET_ENCRYPTION_KEY = 'connection-status-test-key';
    expect(isMfpAccountConnected({ sessionTokenEnc: encryptSecret('session-cookie') })).toBe(true);
  });
});

import { describe, expect, it } from 'vitest';
import { encryptSecret } from '@/lib/secret-box';
import { shouldCronSyncProvider } from '@/lib/cron/provider-sync-gates';

describe('shouldCronSyncProvider', () => {
  it('skips when the account row is missing', () => {
    expect(shouldCronSyncProvider('garmin', null)).toBe(false);
    expect(shouldCronSyncProvider('renpho', null)).toBe(false);
    expect(shouldCronSyncProvider('myfitnesspal', null)).toBe(false);
  });

  it('skips revoked empty credentials so cron does not re-throw reconnect spam', () => {
    expect(shouldCronSyncProvider('garmin', { oauth1TokenEnc: '', oauth2TokenEnc: '' })).toBe(
      false,
    );
    expect(shouldCronSyncProvider('renpho', { email: 'a@b.c', passwordEnc: '' })).toBe(false);
    expect(shouldCronSyncProvider('myfitnesspal', { sessionTokenEnc: '' })).toBe(false);
  });

  it('skips malformed placeholder tokens that would explode AES-GCM decrypt', () => {
    expect(
      shouldCronSyncProvider('garmin', { oauth1TokenEnc: 'demo', oauth2TokenEnc: 'demo' }),
    ).toBe(false);
    expect(shouldCronSyncProvider('renpho', { email: 'a@b.c', passwordEnc: 'demo' })).toBe(false);
  });

  it('syncs when credentials look like real encrypted secrets', () => {
    process.env.SECRET_ENCRYPTION_KEY = 'cron-gate-test-key';
    const enc = encryptSecret('ok');
    expect(shouldCronSyncProvider('garmin', { oauth1TokenEnc: enc, oauth2TokenEnc: enc })).toBe(
      true,
    );
    expect(shouldCronSyncProvider('renpho', { email: 'a@b.c', passwordEnc: enc })).toBe(true);
    expect(shouldCronSyncProvider('myfitnesspal', { sessionTokenEnc: enc })).toBe(true);
  });
});

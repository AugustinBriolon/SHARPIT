import { describe, expect, it } from 'vitest';
import { garminImportTokensSchema } from './route';

describe('garminImportTokensSchema', () => {
  it('accepts python-garminconnect tokenstore object', () => {
    expect(
      garminImportTokensSchema.safeParse({
        tokenStore: {
          di_token: 'a'.repeat(40),
          di_refresh_token: 'b'.repeat(20),
          di_client_id: 'GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2',
        },
      }).success,
    ).toBe(true);
  });

  it('accepts a JSON string payload', () => {
    expect(
      garminImportTokensSchema.safeParse({
        tokenStore: JSON.stringify({
          di_token: 'a'.repeat(40),
          di_refresh_token: 'b'.repeat(20),
        }),
      }).success,
    ).toBe(true);
  });

  it('rejects tiny payloads', () => {
    expect(garminImportTokensSchema.safeParse({ tokenStore: 'short' }).success).toBe(false);
  });
});

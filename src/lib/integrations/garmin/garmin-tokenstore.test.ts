import { describe, expect, it } from 'vitest';
import { mapPythonGarminconnectTokenStore, GarminTokenStoreError } from './garmin-tokenstore';

function b64url(json: object): string {
  return Buffer.from(JSON.stringify(json))
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fakeJwt(payload: object): string {
  return `hdr.${b64url(payload)}.sig`;
}

describe('mapPythonGarminconnectTokenStore', () => {
  it('maps python-garminconnect ≥ 0.3 dumps() shape', () => {
    const exp = Math.floor(Date.now() / 1000) + 1800;
    const di = mapPythonGarminconnectTokenStore({
      di_token: fakeJwt({ client_id: 'GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2', exp }),
      di_refresh_token: 'rt-python',
      di_client_id: 'GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2',
    });

    expect(di.refreshToken).toBe('rt-python');
    expect(di.diClientId).toBe('GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2');
    expect(di.expiresAt).toBe(exp * 1000);
  });

  it('derives di_client_id from JWT when field is missing', () => {
    const di = mapPythonGarminconnectTokenStore({
      di_token: fakeJwt({ client_id: 'GARMIN_CONNECT_MOBILE_IOS_DI' }),
      di_refresh_token: 'rt-python-refresh',
    });
    expect(di.diClientId).toBe('GARMIN_CONNECT_MOBILE_IOS_DI');
  });

  it('rejects empty / partial stores', () => {
    expect(() => mapPythonGarminconnectTokenStore({})).toThrow(GarminTokenStoreError);
    expect(() =>
      mapPythonGarminconnectTokenStore({ di_token: 'short', di_refresh_token: 'x' }),
    ).toThrow(GarminTokenStoreError);
  });
});

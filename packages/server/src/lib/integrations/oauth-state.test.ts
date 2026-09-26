import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ConnectState, createConnectState, readConnectState } from './oauth-state';

const state: ConnectState = {
  provider: 'strava',
  athleteId: 'ath-1',
  returnTo: '/onboarding',
  dataClass: 'activities',
  webOrigin: 'https://web.sharpit.app',
  redirectUri: 'https://api.sharpit.app/api/strava/callback',
};

describe('connect state', () => {
  beforeEach(() => {
    vi.stubEnv('SECRET_ENCRYPTION_KEY', 'test-key');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('carries the connect context through the provider round trip', () => {
    expect(readConnectState(createConnectState(state), 'strava')).toEqual(state);
  });

  it('is bound to the provider it was issued for', () => {
    expect(readConnectState(createConnectState(state), 'withings')).toBeNull();
  });

  it('expires after ten minutes', () => {
    vi.useFakeTimers();
    const raw = createConnectState(state);
    vi.advanceTimersByTime(601_000);
    expect(readConnectState(raw, 'strava')).toBeNull();
  });

  it('refuses a missing or forged state', () => {
    expect(readConnectState(null, 'strava')).toBeNull();
    expect(readConnectState('forged.state', 'strava')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import {
  DATA_CLASSES,
  oauthConnectHref,
  providersForClass,
  PROVIDER_CATALOG,
} from './provider-catalog';

describe('provider-catalog', () => {
  it('lists five data classes', () => {
    expect(DATA_CLASSES.map((c) => c.id)).toEqual([
      'activities',
      'wearable_health',
      'body',
      'nutrition',
      'calendar',
    ]);
  });

  it('places Garmin under activities and wearable_health only', () => {
    const garmin = PROVIDER_CATALOG.find((p) => p.id === 'garmin');
    expect(garmin?.classes).toEqual(['activities', 'wearable_health']);
  });

  it('lists Strava under activities', () => {
    expect(providersForClass('activities').map((p) => p.id)).toContain('strava');
    expect(providersForClass('wearable_health').map((p) => p.id)).not.toContain('strava');
  });

  it('builds oauth href with optional dataClass', () => {
    expect(oauthConnectHref('/api/strava/connect', '/onboarding')).toBe(
      '/api/strava/connect?returnTo=%2Fonboarding',
    );
    expect(oauthConnectHref('/api/strava/connect', '/onboarding', 'activities')).toBe(
      '/api/strava/connect?returnTo=%2Fonboarding&dataClass=activities',
    );
  });
});

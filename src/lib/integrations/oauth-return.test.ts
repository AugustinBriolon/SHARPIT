import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INTEGRATION_RETURN_PATH,
  normalizeOAuthPublicOrigin,
  sanitizeDataClass,
  sanitizeIntegrationReturnTo,
} from '@/lib/integrations/oauth-public-origin';

describe('sanitizeIntegrationReturnTo', () => {
  it('defaults when missing', () => {
    expect(sanitizeIntegrationReturnTo(null)).toBe(DEFAULT_INTEGRATION_RETURN_PATH);
    expect(sanitizeIntegrationReturnTo(undefined)).toBe(DEFAULT_INTEGRATION_RETURN_PATH);
    expect(sanitizeIntegrationReturnTo('')).toBe(DEFAULT_INTEGRATION_RETURN_PATH);
  });

  it('allows onboarding and integrations', () => {
    expect(sanitizeIntegrationReturnTo('/onboarding')).toBe('/onboarding');
    expect(sanitizeIntegrationReturnTo('/settings/integrations')).toBe('/settings/integrations');
    expect(sanitizeIntegrationReturnTo('/settings')).toBe('/settings');
  });

  it('rejects arbitrary paths', () => {
    expect(sanitizeIntegrationReturnTo('/api/cron')).toBe(DEFAULT_INTEGRATION_RETURN_PATH);
    expect(sanitizeIntegrationReturnTo('https://evil.example/onboarding')).toBe('/onboarding');
  });
});

describe('sanitizeDataClass', () => {
  it('accepts known classes', () => {
    expect(sanitizeDataClass('activities')).toBe('activities');
    expect(sanitizeDataClass('wearable_health')).toBe('wearable_health');
  });

  it('rejects unknown values', () => {
    expect(sanitizeDataClass('nope')).toBeNull();
    expect(sanitizeDataClass(null)).toBeNull();
  });
});

describe('normalizeOAuthPublicOrigin', () => {
  it('maps 0.0.0.0 to localhost preserving port', () => {
    expect(normalizeOAuthPublicOrigin('http://0.0.0.0:3000')).toBe('http://localhost:3000');
  });

  it('leaves localhost and production hosts alone', () => {
    expect(normalizeOAuthPublicOrigin('http://localhost:3000')).toBe('http://localhost:3000');
    expect(normalizeOAuthPublicOrigin('https://app.sharpit.example')).toBe(
      'https://app.sharpit.example',
    );
  });
});

describe('publicOriginFromRequest', () => {
  it('prefers Host header over nextUrl bind address', async () => {
    const { publicOriginFromRequest } = await import('@/lib/integrations/oauth-public-origin');
    const { NextRequest } = await import('next/server');
    const nextReq = new NextRequest('http://0.0.0.0:3000/api/strava/connect', {
      headers: { host: 'localhost:3000' },
    });
    expect(publicOriginFromRequest(nextReq)).toBe('http://localhost:3000');
  });
});

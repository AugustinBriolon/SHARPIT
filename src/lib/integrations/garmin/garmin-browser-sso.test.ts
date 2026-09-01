import { describe, expect, it } from 'vitest';
import {
  buildGarminBrowserSsoUrl,
  GARMIN_SSO_EMBED_SERVICE,
  isGarminSsoTicket,
  parseGarminSsoPostMessage,
} from './garmin-browser-sso-shared';
import { createGarminSsoState, parseGarminSsoState } from './garmin-browser-sso';

describe('garmin-browser-sso', () => {
  it('builds embed CAS URL with Garmin-owned service + Sharpit source (no third-party service)', () => {
    const url = buildGarminBrowserSsoUrl('https://app.example.com');
    expect(url).toContain('https://sso.garmin.com/sso/signin?');
    expect(url).toContain(encodeURIComponent(GARMIN_SSO_EMBED_SERVICE));
    expect(url).toContain(encodeURIComponent('https://app.example.com'));
    expect(url).toContain('embedWidget=true');
    expect(url).toContain('consumeServiceTicket=false');
    expect(url).not.toContain('example.com%2Fapi');
  });

  it('round-trips a signed state payload bound to embed service', () => {
    process.env.SECRET_ENCRYPTION_KEY = 'garmin-sso-state-test';
    const raw = createGarminSsoState({ athleteId: 'ath-1' });
    const parsed = parseGarminSsoState(raw);
    expect(parsed?.athleteId).toBe('ath-1');
    expect(parsed?.service).toBe(GARMIN_SSO_EMBED_SERVICE);
    expect(parseGarminSsoState(raw.slice(0, -2) + 'xx')).toBeNull();
  });

  it('accepts ST- tickets only and parses postMessage payloads', () => {
    expect(isGarminSsoTicket('ST-123-abc')).toBe(true);
    expect(isGarminSsoTicket('evil')).toBe(false);
    expect(parseGarminSsoPostMessage(JSON.stringify({ serviceTicket: 'ST-99' }))).toBe('ST-99');
    expect(parseGarminSsoPostMessage({ serviceTicket: 'nope' })).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildGarminBrowserSsoUrl,
  GARMIN_SSO_EMBED_SERVICE,
  isGarminSsoTicket,
  parseGarminSsoPostMessage,
} from './garmin-browser-sso-shared';

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

  it('accepts ST- tickets only and parses postMessage payloads', () => {
    expect(isGarminSsoTicket('ST-123-abc')).toBe(true);
    expect(isGarminSsoTicket('evil')).toBe(false);
    expect(parseGarminSsoPostMessage(JSON.stringify({ serviceTicket: 'ST-99' }))).toBe('ST-99');
    expect(parseGarminSsoPostMessage({ serviceTicket: 'nope' })).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import {
  CONNECT_GARMIN_CALLBACK_PATH,
  garminHandoffCallbackPath,
  garminHandoffCopy,
  parseGarminHandoffStatus,
} from '@/lib/integrations/garmin/garmin-connect-handoff';
import { sanitizeIntegrationReturnTo } from '@/lib/integrations/oauth-public-origin';

describe('Garmin handoff', () => {
  it('reads the outcomes the SSO callback writes', () => {
    expect(parseGarminHandoffStatus('connected')).toBe('connected');
    expect(parseGarminHandoffStatus('invalid_state')).toBe('invalid_state');
    expect(parseGarminHandoffStatus('denied')).toBe('denied');
  });

  it('reads anything unexpected as an error', () => {
    expect(parseGarminHandoffStatus(undefined)).toBe('error');
    expect(parseGarminHandoffStatus('<script>')).toBe('error');
  });

  it('builds a same-origin callback path', () => {
    expect(garminHandoffCallbackPath('cancelled')).toBe(
      '/connect/garmin/callback?garmin=cancelled',
    );
  });

  it('lets the SSO return to the handoff callback, and nowhere else new', () => {
    expect(sanitizeIntegrationReturnTo(CONNECT_GARMIN_CALLBACK_PATH)).toBe(
      CONNECT_GARMIN_CALLBACK_PATH,
    );
    expect(sanitizeIntegrationReturnTo('https://evil.example/connect/garmin/callback')).toBe(
      CONNECT_GARMIN_CALLBACK_PATH,
    );
    expect(sanitizeIntegrationReturnTo('/connect/garmin')).toBe('/settings/integrations');
  });

  it('offers a retry only where a retry can help', () => {
    expect(garminHandoffCopy('connected').canRetry).toBe(false);
    expect(garminHandoffCopy('already_connected').canRetry).toBe(false);
    expect(garminHandoffCopy('denied').canRetry).toBe(true);
    expect(garminHandoffCopy('connected').description).toContain('revenir dans l’app');
  });
});

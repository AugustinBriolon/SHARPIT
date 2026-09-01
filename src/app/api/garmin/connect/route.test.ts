import { describe, expect, it } from 'vitest';
import {
  garminConnectSchema,
  garminConnectErrorMessage,
  SSO_DISABLED_MESSAGE,
} from './route';
import { GarminLoginError } from '@/lib/integrations/garmin/garmin';

describe('garminConnectSchema', () => {
  it('accepts real-world credentials', () => {
    expect(
      garminConnectSchema.safeParse({ username: 'athlete@example.com', password: 'hunter2' })
        .success,
    ).toBe(true);
  });

  it('rejects an oversized username or password payload', () => {
    const tooLong = 'a'.repeat(201);
    expect(garminConnectSchema.safeParse({ username: tooLong, password: 'hunter2' }).success).toBe(
      false,
    );
    expect(garminConnectSchema.safeParse({ username: 'athlete', password: tooLong }).success).toBe(
      false,
    );
  });

  it('rejects empty credentials', () => {
    expect(garminConnectSchema.safeParse({ username: '', password: 'hunter2' }).success).toBe(
      false,
    );
  });
});

describe('garminConnectErrorMessage', () => {
  it('points at local python mint for server_sso_rejected / unknown', () => {
    const msg = garminConnectErrorMessage(
      new GarminLoginError('widget blocked', 'server_sso_rejected'),
    );
    expect(msg).toBe(SSO_DISABLED_MESSAGE);
    expect(msg.toLowerCase()).not.toContain('identifiants');
  });

  it('still allows explicit invalid_credentials wording', () => {
    const msg = garminConnectErrorMessage(new GarminLoginError('bad', 'invalid_credentials'));
    expect(msg.toLowerCase()).toContain('identifiants');
  });
});

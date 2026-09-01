import { describe, expect, it } from 'vitest';
import { garminConnectSchema, garminConnectErrorMessage } from './route';
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
  it('does not blame the password for server_sso_rejected', () => {
    const msg = garminConnectErrorMessage(
      new GarminLoginError('widget blocked', 'server_sso_rejected'),
    );
    expect(msg.toLowerCase()).not.toContain('identifiants');
    expect(msg.toLowerCase()).toContain('serveur');
  });

  it('does not blame the password for unknown failures', () => {
    const msg = garminConnectErrorMessage(new GarminLoginError('boom', 'unknown'));
    expect(msg.toLowerCase()).not.toContain('identifiants');
  });
});

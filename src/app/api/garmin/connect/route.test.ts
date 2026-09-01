import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  garminConnectSchema,
  garminConnectErrorMessage,
  SSO_DISABLED_MESSAGE,
} from './connect-shared';
import { GarminLoginError } from '@/lib/integrations/garmin/garmin';

describe('garminConnectSchema', () => {
  it('accepts real-world credentials', () => {
    expect(
      garminConnectSchema.safeParse({ username: 'athlete@example.com', password: 'hunter2' })
        .success,
    ).toBe(true);
  });

  it('rejects empty credentials', () => {
    expect(garminConnectSchema.safeParse({ username: '', password: 'hunter2' }).success).toBe(
      false,
    );
  });
});

describe('garminConnectErrorMessage', () => {
  it('points at browser SSO / local mint for unknown failures', () => {
    const msg = garminConnectErrorMessage(new GarminLoginError('x', 'server_sso_rejected'));
    expect(msg).toBe(SSO_DISABLED_MESSAGE);
    expect(msg.toLowerCase()).not.toContain('identifiants');
  });
});

describe('garmin browser SSO helpers used by connect', () => {
  beforeEach(() => {
    process.env.SECRET_ENCRYPTION_KEY = 'connect-route-sso-test';
  });

  it('exports password schema only for the legacy POST 501 path', () => {
    void vi;
    expect(garminConnectSchema.shape.password).toBeTruthy();
  });
});

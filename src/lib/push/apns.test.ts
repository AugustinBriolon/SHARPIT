import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import {
  getApnsConfig,
  getOrSignApnsToken,
  isApnsConfigured,
  isTokenExpiredOrInvalid,
  sendApnsNotification,
  type ApnsConfig,
} from './apns';

describe('apns', () => {
  const originalEnv = { ...process.env };

  // Generate a real EC key pair for signing tests
  const { privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

  beforeEach(() => {
    delete process.env.APNS_KEY_ID;
    delete process.env.APNS_TEAM_ID;
    delete process.env.APPLE_TEAM_ID;
    delete process.env.APNS_PRIVATE_KEY;
    delete process.env.APNS_BUNDLE_ID;
    delete process.env.APNS_PRODUCTION;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('getApnsConfig / isApnsConfigured', () => {
    it('returns null when APNS credentials are not set', () => {
      expect(getApnsConfig()).toBeNull();
      expect(isApnsConfigured()).toBe(false);
    });

    it('returns config when APNS credentials are set', () => {
      process.env.APNS_KEY_ID = 'KEY1234567';
      process.env.APNS_TEAM_ID = 'TEAM123456';
      process.env.APNS_PRIVATE_KEY = privateKeyPem;

      const config = getApnsConfig();
      expect(config).not.toBeNull();
      expect(config?.keyId).toBe('KEY1234567');
      expect(config?.teamId).toBe('TEAM123456');
      expect(config?.bundleId).toBe('app.sharpit.ios');
      expect(isApnsConfigured()).toBe(true);
    });

    it('falls back to APPLE_TEAM_ID if APNS_TEAM_ID is unset', () => {
      process.env.APNS_KEY_ID = 'KEY1234567';
      process.env.APPLE_TEAM_ID = 'FALLBACKTEAM';
      process.env.APNS_PRIVATE_KEY = privateKeyPem;

      const config = getApnsConfig();
      expect(config?.teamId).toBe('FALLBACKTEAM');
    });

    it('decodes base64-encoded private key', () => {
      process.env.APNS_KEY_ID = 'KEY1234567';
      process.env.APNS_TEAM_ID = 'TEAM123456';
      process.env.APNS_PRIVATE_KEY = Buffer.from(privateKeyPem).toString('base64');

      const config = getApnsConfig();
      expect(config?.privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });
  });

  describe('getOrSignApnsToken', () => {
    const testConfig: ApnsConfig = {
      keyId: 'TESTKEY123',
      teamId: 'TESTTEAM45',
      privateKey: privateKeyPem,
      bundleId: 'app.sharpit.ios',
      production: false,
    };

    it('generates a valid 3-part ES256 JWT', () => {
      const jwt = getOrSignApnsToken(testConfig);
      const parts = jwt.split('.');
      expect(parts.length).toBe(3);

      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
      expect(header).toEqual({ alg: 'ES256', kid: 'TESTKEY123' });

      const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      expect(claims.iss).toBe('TESTTEAM45');
      expect(typeof claims.iat).toBe('number');
    });

    it('caches the token across subsequent calls', () => {
      const jwt1 = getOrSignApnsToken(testConfig);
      const jwt2 = getOrSignApnsToken(testConfig);
      expect(jwt1).toBe(jwt2);
    });
  });

  describe('isTokenExpiredOrInvalid', () => {
    it('returns true for HTTP 410 Unregistered', () => {
      expect(isTokenExpiredOrInvalid(410)).toBe(true);
      expect(isTokenExpiredOrInvalid(410, 'Unregistered')).toBe(true);
    });

    it('returns true for 400 BadDeviceToken', () => {
      expect(isTokenExpiredOrInvalid(400, 'BadDeviceToken')).toBe(true);
      expect(isTokenExpiredOrInvalid(400, 'DeviceTokenNotForTopic')).toBe(true);
    });

    it('returns false for transient or other errors', () => {
      expect(isTokenExpiredOrInvalid(500, 'InternalServerError')).toBe(false);
      expect(isTokenExpiredOrInvalid(429, 'TooManyRequests')).toBe(false);
      expect(isTokenExpiredOrInvalid(200)).toBe(false);
    });
  });

  describe('sendApnsNotification', () => {
    it('returns APNS_NOT_CONFIGURED when configuration is absent', async () => {
      const result = await sendApnsNotification({
        deviceToken: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        payload: {
          aps: {
            alert: {
              title: 'Test',
              body: 'Message',
            },
          },
        },
      });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('APNS_NOT_CONFIGURED');
    });
  });
});

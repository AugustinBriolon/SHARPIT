import { afterEach, describe, expect, it } from 'vitest';
import { buildOpsSmokeReport } from './ops-smoke';

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('buildOpsSmokeReport', () => {
  it('reports missing cron secret without echoing any secret value', () => {
    delete process.env.CRON_SECRET;
    delete process.env.SECRET_ENCRYPTION_KEY;
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.SIGNUP_GATE_ENABLED;
    delete process.env.SIGNUP_ALLOWED_EMAILS;
    delete process.env.SIGNUP_INVITE_CODES;

    const report = buildOpsSmokeReport();

    expect(report.ok).toBe(false);
    expect(report.checks.cronSecret).toBe('missing');
    expect(report.checks.secretEncryptionKey).toBe('missing');
    expect(report.checks.upstash).toBe('missing');
    expect(JSON.stringify(report)).not.toMatch(/sk_|Bearer |postgresql:\/\//i);
  });

  it('is ok when cron + encryption key + upstash are present and roundtrip works', () => {
    process.env.CRON_SECRET = 'cron-test-secret';
    process.env.SECRET_ENCRYPTION_KEY = 'encryption-test-key-not-a-real-secret';
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'upstash-token';
    process.env.SIGNUP_GATE_ENABLED = 'true';
    process.env.SIGNUP_ALLOWED_EMAILS = 'ada@example.com';

    const report = buildOpsSmokeReport();

    expect(report.checks.cronSecret).toBe('configured');
    expect(report.checks.secretEncryptionKey).toBe('configured');
    expect(report.checks.encryptionRoundtrip).toBe('ok');
    expect(report.checks.upstash).toBe('configured');
    expect(report.checks.signupGate).toBe('enabled');
    expect(report.ok).toBe(true);
    expect(JSON.stringify(report)).not.toContain('cron-test-secret');
    expect(JSON.stringify(report)).not.toContain('encryption-test-key');
  });

  it('marks signup gate disabled when unset', () => {
    process.env.CRON_SECRET = 'x';
    process.env.SECRET_ENCRYPTION_KEY = 'y';
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 't';
    delete process.env.SIGNUP_GATE_ENABLED;
    delete process.env.SIGNUP_ALLOWED_EMAILS;
    delete process.env.SIGNUP_INVITE_CODES;

    expect(buildOpsSmokeReport().checks.signupGate).toBe('disabled');
  });
});

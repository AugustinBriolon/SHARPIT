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

    const report = buildOpsSmokeReport();

    expect(report.checks.cronSecret).toBe('configured');
    expect(report.checks.secretEncryptionKey).toBe('configured');
    expect(report.checks.encryptionRoundtrip).toBe('ok');
    expect(report.checks.upstash).toBe('configured');
    expect(report.ok).toBe(true);
    expect(JSON.stringify(report)).not.toContain('cron-test-secret');
    expect(JSON.stringify(report)).not.toContain('encryption-test-key');
  });

  it('reports upstash missing without failing ok when crypto is fine', () => {
    process.env.CRON_SECRET = 'x';
    process.env.SECRET_ENCRYPTION_KEY = 'y';
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const report = buildOpsSmokeReport();
    expect(report.checks.upstash).toBe('missing');
    expect(report.ok).toBe(true);
  });
});

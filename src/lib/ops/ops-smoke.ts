import { encryptSecret, decryptSecret } from '@/lib/secret-box';

export type OpsSmokeReport = {
  ok: boolean;
  checks: {
    cronSecret: 'configured' | 'missing';
    secretEncryptionKey: 'configured' | 'missing';
    encryptionRoundtrip: 'ok' | 'failed' | 'skipped';
    upstash: 'configured' | 'missing';
  };
};

function configuredOrMissing(value: string | undefined): 'configured' | 'missing' {
  return value ? 'configured' : 'missing';
}

function probeEncryptionRoundtrip(): OpsSmokeReport['checks']['encryptionRoundtrip'] {
  try {
    const probe = `smoke:${Date.now()}`;
    const decoded = decryptSecret(encryptSecret(probe));
    return decoded === probe ? 'ok' : 'failed';
  } catch {
    return 'failed';
  }
}

/**
 * Minimal ops smoke — surfaces missing CRON_SECRET / encryption / Upstash
 * without ever echoing secret values. Intended for `GET /api/cron/smoke`
 * behind `verifyCronSecret` (or local diagnostics).
 *
 * `ok` requires cron secret + encryption key configured and a successful
 * encrypt/decrypt roundtrip. Upstash is reported but does not fail the overall
 * smoke alone (dev may omit it; prod coach/sync fail closed separately).
 */
export function buildOpsSmokeReport(): OpsSmokeReport {
  const cronSecret = configuredOrMissing(process.env.CRON_SECRET);
  const secretEncryptionKey = configuredOrMissing(process.env.SECRET_ENCRYPTION_KEY);
  const upstash =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
      ? 'configured'
      : 'missing';
  const encryptionRoundtrip =
    secretEncryptionKey === 'configured' ? probeEncryptionRoundtrip() : 'skipped';

  return {
    ok:
      cronSecret === 'configured' &&
      secretEncryptionKey === 'configured' &&
      encryptionRoundtrip === 'ok',
    checks: {
      cronSecret,
      secretEncryptionKey,
      encryptionRoundtrip,
      upstash,
    },
  };
}

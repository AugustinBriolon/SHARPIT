import { encryptSecret, decryptSecret } from '@/lib/secret-box';
import { isSignupGateEnabled } from '@/lib/auth/signup-gate';

export type OpsSmokeReport = {
  ok: boolean;
  checks: {
    cronSecret: 'configured' | 'missing';
    secretEncryptionKey: 'configured' | 'missing';
    encryptionRoundtrip: 'ok' | 'failed' | 'skipped';
    upstash: 'configured' | 'missing';
    signupGate: 'enabled' | 'disabled';
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
 * encrypt/decrypt roundtrip. Upstash and signup gate are reported but do not
 * fail the overall smoke (Upstash may be optional in some environments;
 * signup gate is a product toggle).
 */
export function buildOpsSmokeReport(): OpsSmokeReport {
  const cronSecret = configuredOrMissing(process.env.CRON_SECRET);
  const secretEncryptionKey = configuredOrMissing(process.env.SECRET_ENCRYPTION_KEY);
  const upstash =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
      ? 'configured'
      : 'missing';
  const signupGate = isSignupGateEnabled() ? 'enabled' : 'disabled';
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
      signupGate,
    },
  };
}

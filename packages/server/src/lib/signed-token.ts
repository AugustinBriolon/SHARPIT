import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * A short-lived, tamper-proof value carried through a browser round trip instead of a cookie
 * (ADR-048: `api.` never sets one): `base64url(JSON).HMAC-SHA256`. It is signed, not
 * encrypted — never put a secret in the payload. Every payload carries `exp` (unix seconds).
 */

function signingKey(): string {
  if (process.env.SECRET_ENCRYPTION_KEY) {
    return process.env.SECRET_ENCRYPTION_KEY;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SECRET_ENCRYPTION_KEY is not configured — refusing to sign in production.');
  }
  return process.env.CRON_SECRET ?? process.env.DATABASE_URL ?? 'sharpit-dev-signed-token';
}

function signatureOf(body: string): string {
  return createHmac('sha256', signingKey()).update(body).digest('base64url');
}

function sameSignature(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function signToken<T extends { exp: number }>(payload: T): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${signatureOf(body)}`;
}

/** The payload when the signature holds and `exp` is in the future; null otherwise. */
export function readSignedToken(raw: string | null | undefined): Record<string, unknown> | null {
  const [body, signature, extra] = (raw ?? '').split('.');
  if (!body || !signature || extra !== undefined || !sameSignature(signature, signatureOf(body))) {
    return null;
  }
  try {
    const payload: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const { exp } = payload as { exp?: unknown };
    return typeof exp === 'number' && exp > Date.now() / 1000
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

import crypto from 'crypto';

/**
 * `SECRET_ENCRYPTION_KEY` is the only secret this module should ever use —
 * a dedicated value with no purpose but encrypting provider credentials at
 * rest. Production must configure the dedicated key explicitly, since
 * silently falling back to a secret rotated for an unrelated reason would
 * make every already-encrypted row unreadable without warning — so the
 * `CRON_SECRET`/`DATABASE_URL` convenience fallback below only ever applies
 * outside production, where `DATABASE_URL` is otherwise always set and would
 * defeat the production check entirely.
 */
function encryptionKey(): Buffer {
  if (process.env.SECRET_ENCRYPTION_KEY) {
    return crypto.createHash('sha256').update(process.env.SECRET_ENCRYPTION_KEY).digest();
  }
  if (process.env.NODE_ENV !== 'development') {
    throw new Error(
      'SECRET_ENCRYPTION_KEY is not configured — refusing to encrypt/decrypt provider credentials with no key in production.',
    );
  }
  const devFallback = process.env.CRON_SECRET ?? process.env.DATABASE_URL ?? 'sharpit-dev-insecure';
  return crypto.createHash('sha256').update(devFallback).digest();
}

/** Chiffre une valeur sensible (ex. mot de passe Renpho) avant stockage en base. */
export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptSecret(encoded: string): string {
  const buf = Buffer.from(encoded, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const encrypted = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

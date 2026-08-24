import crypto from 'crypto';

/**
 * `SECRET_ENCRYPTION_KEY` is the only secret this module should ever use —
 * a dedicated value with no purpose but encrypting provider credentials at
 * rest. `CRON_SECRET`/`DATABASE_URL` stay as a local-dev convenience only
 * (never set `SECRET_ENCRYPTION_KEY` locally? this still works); production
 * must configure the dedicated key explicitly, since silently falling back
 * to a secret rotated for an unrelated reason would make every already-
 * encrypted row unreadable without warning.
 */
function encryptionKey(): Buffer {
  const secret =
    process.env.SECRET_ENCRYPTION_KEY ?? process.env.CRON_SECRET ?? process.env.DATABASE_URL;
  if (secret) return crypto.createHash('sha256').update(secret).digest();
  if (process.env.NODE_ENV === 'development') {
    return crypto.createHash('sha256').update('sharpit-dev-insecure').digest();
  }
  throw new Error(
    'SECRET_ENCRYPTION_KEY is not configured — refusing to encrypt/decrypt provider credentials with no key in production.',
  );
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

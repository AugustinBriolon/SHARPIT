import { timingSafeEqualString } from '@/lib/crypto/timing-safe-equal';

/**
 * Verifies the Vercel Cron `Authorization: Bearer <CRON_SECRET>` header.
 * Fails closed when `CRON_SECRET` isn't set — otherwise every cron route
 * would accept the literal header `Bearer undefined` as valid.
 */
export function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  const auth = request.headers.get('authorization');
  return !!auth && timingSafeEqualString(auth, `Bearer ${secret}`);
}

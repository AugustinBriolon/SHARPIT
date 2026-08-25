import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string comparison — a plain `===`/`!==` on a secret leaks
 * timing information proportional to how many leading bytes match. Used for
 * the cron `Bearer` secret check (src/app/api/cron/*\/route.ts).
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on length mismatch. Run an equal-cost dummy compare
  // before returning false, so a length difference doesn't short-circuit in
  // less time than a full compare would take.
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

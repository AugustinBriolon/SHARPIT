/**
 * Dev-only escape hatch when Clerk is unreachable (corporate proxy / SSL inspection).
 * Never enable in production.
 */
export function isDevClerkBypass(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_CLERK === 'true';
}

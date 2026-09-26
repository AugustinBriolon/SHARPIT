/**
 * Neon's serverless adapter talks over WebSocket, which also crosses proxies that block Postgres'
 * TCP 5432. `PRISMA_NEON_ADAPTER` forces it on or off; otherwise a Neon host turns it on.
 */
export function shouldUseNeonAdapter(
  connectionString: string | undefined,
  override: string | undefined,
): boolean {
  if (!connectionString) {
    return false;
  }
  if (override === 'false') {
    return false;
  }
  if (override === 'true') {
    return true;
  }
  return connectionString.includes('neon.tech');
}

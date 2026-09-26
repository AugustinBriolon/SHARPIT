/**
 * Canonical public origin of the web app (ADR-040) — `https://sharpit.app` in production.
 * Absolute links handed to native clients (empty states, handoffs) are built from
 * `NEXT_PUBLIC_APP_URL`; the request's own origin is only a local-dev fallback.
 */
export function appOrigin(fallbackOrigin: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  return fallbackOrigin.replace(/\/+$/, '');
}

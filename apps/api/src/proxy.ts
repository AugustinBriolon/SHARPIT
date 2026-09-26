import { apiProxy } from '@sharpit/server/lib/hosts/api-proxy';

/**
 * Every request to this app is an `api.` request (ADR-048): JSON only, Bearer only, no cookie,
 * CORS for the thin web only — whatever host it arrives on.
 */
export default apiProxy;

export const config = {
  matcher: ['/((?!_next/).*)'],
};

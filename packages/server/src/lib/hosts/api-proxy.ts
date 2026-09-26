import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server';
import { clerkMiddleware } from '@clerk/nextjs/server';
import {
  apiHostError,
  isCronPath,
  screenApiHostRequest,
  sealApiHostResponse,
} from '@sharpit/server/lib/hosts/api-host';
import {
  checkRateLimit,
  rateLimiters,
  rateLimitResponseBody,
} from '@sharpit/server/lib/rate-limit';

/** Flooding backstop for every authenticated API call — generous, per athlete. */
export async function rateLimitApiUser(
  userId: string,
  pathname: string,
): Promise<NextResponse | null> {
  if (!pathname.startsWith('/api/')) {
    return null;
  }
  const result = await checkRateLimit(rateLimiters.apiGeneral, userId);
  if (result.ok) {
    return null;
  }
  return NextResponse.json(rateLimitResponseBody(result.retryAfterSeconds), { status: 429 });
}

// Bearer only: no page, no sign-in redirect, no handshake — a missing or rejected token is a
// 401 JSON, never Clerk's 404 rewrite.
const bearerProxy = clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  if (!userId) {
    return apiHostError(req, 401, 'Invalid or expired token');
  }
  return rateLimitApiUser(userId, req.nextUrl.pathname);
});

function asNextResponse(response: Response): NextResponse {
  return response instanceof NextResponse ? response : new NextResponse(response.body, response);
}

/**
 * The `api.` contract as a proxy (ADR-048): JSON only, Bearer only, no cookie, no cached
 * authenticated answer, CORS for the thin web only. `apps/api` runs it on every request; the web
 * app runs it for the `api.sharpit.app` host until that host leaves it.
 *
 * Crons carry `Bearer <CRON_SECRET>`, which is not a Clerk token: they skip Clerk and their
 * route verifies the secret (and refuses everything when it is not configured).
 */
export async function apiProxy(req: NextRequest, event: NextFetchEvent): Promise<NextResponse> {
  const screened = screenApiHostRequest(req);
  if (screened) {
    return screened;
  }
  if (isCronPath(req.nextUrl.pathname)) {
    return sealApiHostResponse(req, NextResponse.next());
  }
  const response = (await bearerProxy(req, event)) ?? NextResponse.next();
  return sealApiHostResponse(req, asNextResponse(response));
}

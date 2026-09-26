import { NextResponse, type NextRequest } from 'next/server';
import {
  describeClerkConfigIssues,
  diagnoseClerkConfig,
} from '@sharpit/server/lib/auth/clerk-config';

const HANDSHAKE_CARRIERS = ['__clerk_handshake', '__clerk_handshake_nonce'];
/** Everything Clerk may carry through a handshake round trip — never logged, always dropped. */
const HANDSHAKE_PARAMS = [
  ...HANDSHAKE_CARRIERS,
  '__clerk_help',
  '__clerk_hs_reason',
  '__clerk_db_jwt',
  '__dev_session',
];

/** How many clean retries a browser gets within `RETRY_WINDOW_S` before we stop. */
export const HANDSHAKE_RETRY_COOKIE = 'sharpit_auth_retry';
const MAX_RETRIES = 2;
const RETRY_WINDOW_S = 60;

export function carriesHandshake(req: NextRequest): boolean {
  return (
    HANDSHAKE_CARRIERS.some((name) => req.nextUrl.searchParams.has(name)) ||
    HANDSHAKE_CARRIERS.some((name) => req.cookies.has(name))
  );
}

/** Classifies without echoing the message — it may be built from request data. */
function failureKind(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('signature')) {
    return 'invalid_signature';
  }
  if (message.includes('jwk')) {
    return 'jwk_unavailable';
  }
  if (message.includes('expired') || message.includes('clock')) {
    return 'token_time';
  }
  return 'other';
}

function clearHandshakeCookies(response: NextResponse): NextResponse {
  for (const name of HANDSHAKE_CARRIERS) {
    response.cookies.delete(name);
  }
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function unavailablePage(): NextResponse {
  const html =
    '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SHARPIT</title>' +
    '<body style="font-family:system-ui,sans-serif;max-width:28rem;margin:4rem auto;padding:0 1rem;line-height:1.5">' +
    '<h1 style="font-size:1.25rem">Connexion momentanément indisponible</h1>' +
    '<p>La session n’a pas pu être vérifiée. Réessaie dans une minute.</p></body></html>';
  return clearHandshakeCookies(
    new NextResponse(html, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }),
  );
}

/**
 * A development Clerk instance rethrows a failed handshake verification (production only
 * logs it), which surfaced as a bare 500 on `/?__clerk_handshake=…`. Here the handshake
 * material is dropped and the same URL is retried once or twice — still through
 * `clerkMiddleware`, so nothing is granted — then a readable 503 ends any loop. The
 * cause (usually mismatched keys) is logged by rule name only.
 */
export function recoverFromHandshakeFailure(req: NextRequest, error: unknown): NextResponse | null {
  if (!carriesHandshake(req)) {
    return null;
  }
  console.error('[auth] Clerk handshake failed', {
    kind: failureKind(error),
    config: describeClerkConfigIssues(diagnoseClerkConfig()),
  });

  const retries = Number(req.cookies.get(HANDSHAKE_RETRY_COOKIE)?.value ?? '0') || 0;
  if (req.method !== 'GET' || retries >= MAX_RETRIES) {
    return unavailablePage();
  }

  const clean = req.nextUrl.clone();
  for (const name of HANDSHAKE_PARAMS) {
    clean.searchParams.delete(name);
  }
  const response = clearHandshakeCookies(NextResponse.redirect(clean));
  response.cookies.set(HANDSHAKE_RETRY_COOKIE, String(retries + 1), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: RETRY_WINDOW_S,
  });
  return response;
}

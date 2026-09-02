import { NextResponse } from 'next/server';
import { INVITE_COOKIE, isInviteCodeValid, normalizeInviteCode } from '@/lib/auth/signup-gate';

/**
 * Stamps the invite cookie from a query string, then sends the visitor to
 * `/sign-up`. Used when sharing `https://app…/api/invite/redeem?code=…`
 * (and by the sign-up page when `?invite=` is present — Server Components
 * cannot set cookies during render).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = normalizeInviteCode(url.searchParams.get('code') ?? url.searchParams.get('invite'));
  const signUp = new URL('/sign-up', url.origin);

  if (!code || !isInviteCodeValid(code)) {
    signUp.searchParams.set('invite_error', '1');
    return NextResponse.redirect(signUp);
  }

  const response = NextResponse.redirect(signUp);
  response.cookies.set(INVITE_COOKIE, code, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

import { NextResponse, type NextRequest } from 'next/server';
import { DEMO_COOKIE } from '@/lib/demo/demo-session';

/** Clears the demo cookie and sends the visitor to the real sign-in page. */
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL('/sign-in', request.url));
  response.cookies.delete(DEMO_COOKIE);
  return response;
}

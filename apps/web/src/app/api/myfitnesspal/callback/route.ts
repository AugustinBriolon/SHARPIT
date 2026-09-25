import { NextResponse } from 'next/server';

// No OAuth callback needed — MFP uses credentials-based login.
// Kept as a no-op bounce to settings integrations.
export function GET(request: Request) {
  return NextResponse.redirect(new URL('/settings/integrations', request.url));
}

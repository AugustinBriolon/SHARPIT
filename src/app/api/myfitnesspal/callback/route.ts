import { NextResponse } from 'next/server';

// No OAuth callback needed — MFP uses credentials-based login.
// This route is kept as a no-op to avoid 404s.
export function GET() {
  return NextResponse.redirect('/settings');
}

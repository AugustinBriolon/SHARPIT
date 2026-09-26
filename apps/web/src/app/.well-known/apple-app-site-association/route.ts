import { NextResponse } from 'next/server';
import { appleAppSiteAssociation } from '@sharpit/app/lib/apple-app-site-association';

/**
 * Apple App Site Association for https://sharpit.app (ADR-040). Apple's CDN fetches it
 * without cookies and refuses redirects — the route is public in `proxy.ts` and answers
 * JSON directly. Prerendered at build: a new `APPLE_TEAM_ID` ships with the next deploy.
 */
export function GET() {
  return NextResponse.json(appleAppSiteAssociation(process.env.APPLE_TEAM_ID), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

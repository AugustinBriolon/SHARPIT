import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_INTEGRATION_RETURN_PATH } from '@sharpit/server/lib/integrations/oauth-public-origin';

/**
 * Legacy bounce URL — OAuth callbacks redirect straight to onboarding / settings. Kept so old
 * bookmarks still land somewhere useful, with their outcome query.
 */
export function GET(request: NextRequest) {
  const target = new URL(DEFAULT_INTEGRATION_RETURN_PATH, request.nextUrl.origin);
  target.search = request.nextUrl.search;
  return NextResponse.redirect(target);
}

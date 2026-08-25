import { NextRequest } from 'next/server';
import { redirectAfterIntegrationConnect } from '@/lib/integrations/oauth-return';

/**
 * Legacy bounce URL — OAuth callbacks now redirect straight to onboarding /
 * settings. Kept so old bookmarks / in-flight OAuth still land somewhere useful.
 */
export async function GET(request: NextRequest) {
  const provider =
    (['strava', 'google', 'withings', 'myfitnesspal'] as const).find((id) =>
      request.nextUrl.searchParams.has(id),
    ) ?? 'strava';
  const status = request.nextUrl.searchParams.get(provider) ?? 'connected';
  const extra: Record<string, string> = {};
  for (const [key, value] of request.nextUrl.searchParams.entries()) {
    if (key !== provider) extra[key] = value;
  }
  return redirectAfterIntegrationConnect(request, provider, status, extra);
}

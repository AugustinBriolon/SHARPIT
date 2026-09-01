import type { Viewport } from 'next';
import { GarminBrowserSsoClient } from '@/components/settings/integrations/garmin-browser-sso-client';
import { sanitizeIntegrationReturnTo } from '@/lib/integrations/oauth-public-origin';

type PageProps = {
  searchParams: Promise<{ returnTo?: string }>;
};

/**
 * Page-local only: iOS Safari zooms when focused inputs (including inside the
 * cross-origin Garmin SSO iframe) compute font-size < 16px. Cap scale here so
 * the rest of Sharpit stays pinch-zoomable.
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default async function GarminBrowserSsoPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <GarminBrowserSsoClient returnTo={sanitizeIntegrationReturnTo(params.returnTo)} />;
}

import { GarminBrowserSsoClient } from '@/components/settings/integrations/garmin-browser-sso-client';
import { sanitizeIntegrationReturnTo } from '@/lib/integrations/oauth-public-origin';

type PageProps = {
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function GarminBrowserSsoPage({ searchParams }: PageProps) {
  const params = await searchParams;
  return <GarminBrowserSsoClient returnTo={sanitizeIntegrationReturnTo(params.returnTo)} />;
}

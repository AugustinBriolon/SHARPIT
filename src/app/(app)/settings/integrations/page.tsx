import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { IntegrationsHubSection } from '@/components/settings/integrations-hub-section';
import { IntegrationsHubShell } from '@/components/settings/integrations-hub-shell';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{
    strava?: string;
    google?: string;
    googleDetail?: string;
    withings?: string;
    withingsDetail?: string;
  }>;
};

export default async function SettingsIntegrationsPage({ searchParams }: PageProps) {
  const params = await searchParams;

  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Réglages" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Réglages</p>
        <h1 className="text-page-title mt-1">Applications connectées</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Connecte tes sources, lance les synchronisations et contrôle la fraîcheur des données.
        </p>
      </StickyHeader>

      <Suspense fallback={<IntegrationsHubShell pending />}>
        <IntegrationsHubSection searchParams={params} />
      </Suspense>
    </div>
  );
}

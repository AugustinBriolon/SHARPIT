import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { IntegrationsHubShell } from '@/components/settings/integrations-hub-shell';

export default function SettingsIntegrationsLoading() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Réglages" showOnDesktop />
      <StickyHeader>
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Réglages
        </p>
        <h1 className="font-heading mt-1 text-2xl font-semibold">Applications connectées</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Connecte tes sources, lance les synchronisations et contrôle la fraîcheur des données.
        </p>
      </StickyHeader>

      <IntegrationsHubShell pending />
    </div>
  );
}

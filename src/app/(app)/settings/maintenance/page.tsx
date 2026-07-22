import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { SettingsMaintenancePanel } from '@/components/settings/maintenance';

export default function SettingsMaintenancePage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Réglages" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Réglages</p>
        <h1 className="text-page-title mt-1">Maintenance</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Outils techniques pour repartir d&apos;une base propre et relancer les données.
        </p>
      </StickyHeader>

      <SettingsMaintenancePanel />
    </div>
  );
}

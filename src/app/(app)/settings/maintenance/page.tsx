import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { SettingsMaintenancePanel } from '@/components/settings/settings-maintenance-panel';

export default function SettingsMaintenancePage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Réglages" showOnDesktop />
      <StickyHeader>
        <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
          Réglages
        </p>
        <h1 className="font-heading mt-1 text-2xl font-semibold">Maintenance</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Outils techniques pour repartir d&apos;une base propre et relancer les données.
        </p>
      </StickyHeader>

      <SettingsMaintenancePanel />
    </div>
  );
}

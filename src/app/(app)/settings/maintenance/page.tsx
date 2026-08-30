import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { SettingsMaintenancePanel } from '@/components/settings/maintenance';
import { SettingsDemoBlock } from '@/components/settings/settings-demo-block';
import { Skeleton } from '@/components/ui/skeleton';
import { isDemoSession } from '@/lib/demo/demo-session';

function MaintenanceSkeleton() {
  return <Skeleton className="h-48 w-full rounded-xl" aria-busy />;
}

async function MaintenanceSection() {
  if (await isDemoSession()) {
    return (
      <SettingsDemoBlock description="Les outils de maintenance touchent un compte réel. Désactivés sur le compte démo partagé." />
    );
  }

  return <SettingsMaintenancePanel />;
}

export default function SettingsMaintenancePage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Profil" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Profil</p>
        <h1 className="text-page-title mt-1">Maintenance</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Outils techniques pour repartir d&apos;une base propre et relancer les données.
        </p>
      </StickyHeader>

      {/* Header above is static and prerenders; only the demo check waits. */}
      <Suspense fallback={<MaintenanceSkeleton />}>
        <MaintenanceSection />
      </Suspense>
    </div>
  );
}

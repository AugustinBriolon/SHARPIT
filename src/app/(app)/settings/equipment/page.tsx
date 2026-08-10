import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { EquipmentPanel } from '@/components/settings/equipment';
import { normalizeAthleteEquipment } from '@/lib/equipment/parse';
import { getAthleteProfile } from '@/lib/queries';

async function EquipmentPanelWithProfile() {
  const athleteProfile = await getAthleteProfile().catch(() => null);

  return <EquipmentPanel initial={normalizeAthleteEquipment(athleteProfile?.equipment ?? null)} />;
}

export const instant = true;

export default function SettingsEquipmentPage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Réglages" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Réglages</p>
        <h1 className="text-page-title mt-1">Équipement</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Capacités d&apos;entraînement par sport — pour adapter les séances à ce que tu as
          vraiment.
        </p>
      </StickyHeader>

      {/* Header above is static and prerenders; only the athlete's equipment waits. */}
      <Suspense>
        <EquipmentPanelWithProfile />
      </Suspense>
    </div>
  );
}

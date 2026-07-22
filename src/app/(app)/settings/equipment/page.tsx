import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { EquipmentPanel } from '@/components/settings/equipment';
import { normalizeAthleteEquipment } from '@/lib/equipment/parse';
import { getAthleteProfile } from '@/lib/queries';

export const dynamic = 'force-dynamic';

export default async function SettingsEquipmentPage() {
  const athleteProfile = await getAthleteProfile().catch(() => null);

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

      <EquipmentPanel initial={normalizeAthleteEquipment(athleteProfile?.equipment ?? null)} />
    </div>
  );
}

import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { EquipmentPanel } from '@/components/settings/equipment';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { normalizeAthleteEquipment } from '@/lib/equipment/parse';
import { getAthleteProfile } from '@/lib/queries';

function EquipmentPanelSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="bg-muted/45 inline-flex max-w-full gap-1 rounded-full p-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-20 shrink-0 rounded-full border-0" />
        ))}
      </div>
      <div className="space-y-1">
        <Skeleton className="h-3 w-16 rounded-full border-0" />
        <Skeleton className="h-3 w-full max-w-md rounded-full border-0" />
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="rounded-analysis-lg h-16 w-full border-0" />
      ))}
    </div>
  );
}

async function EquipmentPanelWithProfile() {
  const athleteId = await getCurrentAthleteId();
  const athleteProfile = await getAthleteProfile(athleteId).catch(() => null);

  return <EquipmentPanel initial={normalizeAthleteEquipment(athleteProfile?.equipment ?? null)} />;
}

export default function SettingsEquipmentPage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Profil" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Profil</p>
        <h1 className="text-page-title mt-1">Équipement</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Capacités d&apos;entraînement par sport — pour adapter les séances à ce que tu as
          vraiment.
        </p>
      </StickyHeader>

      {/* Header above is static and prerenders; only the athlete's equipment waits. */}
      <Suspense fallback={<EquipmentPanelSkeleton />}>
        <EquipmentPanelWithProfile />
      </Suspense>
    </div>
  );
}

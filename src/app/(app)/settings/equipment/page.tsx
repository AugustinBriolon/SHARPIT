import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { EquipmentPanel } from '@/components/settings/equipment';
import { SettingsDemoBlock } from '@/components/settings/settings-demo-block';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { isDemoSession } from '@/lib/demo/demo-session';
import { normalizeAthleteEquipment } from '@/lib/equipment/parse';
import { normalizeAthletePracticedSports } from '@/lib/practiced-sports';
import { getAthleteProfile } from '@/lib/queries';

function EquipmentPanelSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-11 w-full max-w-sm rounded-lg border-0" />
        ))}
      </div>
      <div className="bg-muted/45 inline-flex max-w-full gap-1 rounded-full p-1">
        {Array.from({ length: 3 }).map((_, index) => (
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
  if (await isDemoSession()) {
    return (
      <SettingsDemoBlock description="L'équipement touche un compte réel. Désactivé sur le compte démo partagé." />
    );
  }

  const athleteId = await getCurrentAthleteId();
  const athleteProfile = await getAthleteProfile(athleteId).catch(() => null);

  return (
    <EquipmentPanel
      initial={normalizeAthleteEquipment(athleteProfile?.equipment ?? null)}
      initialPracticedSports={normalizeAthletePracticedSports(
        athleteProfile?.practicedSports ?? null,
      )}
    />
  );
}

export default function SettingsEquipmentPage() {
  return (
    <div className="space-y-4">
      <MobileBackLink fallbackHref="/moi" fallbackLabel="Moi" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Moi</p>
        <h1 className="text-page-title mt-1">Équipement</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Sports pratiqués et capacités d&apos;entraînement — pour adapter les propositions à ce que
          tu fais vraiment.
        </p>
      </StickyHeader>

      {/* Header above is static and prerenders; only the athlete's equipment waits. */}
      <Suspense fallback={<EquipmentPanelSkeleton />}>
        <EquipmentPanelWithProfile />
      </Suspense>
    </div>
  );
}

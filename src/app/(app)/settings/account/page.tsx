import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { PersonalProfilePanel } from '@/components/settings/profile';
import { SettingsDemoBlock } from '@/components/settings/settings-demo-block';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { isDemoSession } from '@/lib/demo/demo-session';
import { isHangingPromiseRejection } from '@/lib/next/hanging-promise';
import { mapAthleteProfileToFormData } from '@/lib/profile/map-athlete-profile';
import { getAthleteProfile } from '@/lib/queries';

function ProfilePanelSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <Skeleton className="h-8 w-40 rounded-full border-0" />
      <Skeleton className="rounded-analysis-lg h-48 w-full border-0" />
      <Skeleton className="rounded-analysis-lg h-32 w-full border-0" />
    </div>
  );
}

async function ProfilePanelWithData() {
  if (await isDemoSession()) {
    return (
      <SettingsDemoBlock description="L'identité, le sommeil et les paramètres personnels touchent un compte réel. Désactivés sur le compte démo partagé." />
    );
  }

  let loadError: string | null = null;
  let athleteProfile = null;
  try {
    const athleteId = await getCurrentAthleteId();
    athleteProfile = await getAthleteProfile(athleteId);
  } catch (error) {
    if (isHangingPromiseRejection(error)) {
      throw error;
    }
    console.error('[settings/account] getAthleteProfile failed', error);
    loadError =
      'Chargement du profil impossible. Réessaie avant d’enregistrer — un enregistrement à vide effacerait tes données.';
  }

  return (
    <PersonalProfilePanel
      initial={mapAthleteProfileToFormData(athleteProfile)}
      loadError={loadError}
    />
  );
}

export default function SettingsAccountPage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Profil" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Profil</p>
        <h1 className="text-page-title mt-1">Mon profil</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Identité et rythme de vie — les repères de performance sont dans Progression.
        </p>
      </StickyHeader>

      {/* Header above is static and prerenders; only the athlete profile waits. */}
      <Suspense fallback={<ProfilePanelSkeleton />}>
        <ProfilePanelWithData />
      </Suspense>
    </div>
  );
}

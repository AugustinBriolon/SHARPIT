import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/header/mobile-back-link';
import { StickyHeader } from '@/components/layout/header/sticky-header';
import { PrivacySettingsPanel } from '@/components/privacy/privacy-settings-panel';
import { PersonalProfilePanel } from '@/components/settings/profile';
import { SettingsDemoBlock } from '@/components/settings/settings-demo-block';
import { SettingsSignOut } from '@/components/settings/settings-sign-out';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { isDemoSession } from '@/lib/demo/demo-session';
import { MOI_HUB_PATH } from '@/lib/moi/paths';
import { isHangingPromiseRejection } from '@/lib/next/hanging-promise';
import { serializeConsentRow } from '@/lib/privacy/consent-serialize';
import { getAthleteConsentRow } from '@/lib/privacy/consent-store';
import { mapAthleteProfileToFormData } from '@/lib/profile/map-athlete-profile';
import { getAthleteProfile } from '@/lib/queries';
import { CONTROLLER_EMAIL } from '@/lib/privacy/constants';

function ProfileIdentityFallback() {
  return (
    <div className="space-y-3" aria-busy>
      <Skeleton className="rounded-analysis h-48 w-full border-0" />
    </div>
  );
}

function PrivacySkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <Skeleton className="rounded-analysis-lg h-32 w-full border-0" />
      <Skeleton className="rounded-analysis-lg h-48 w-full border-0" />
    </div>
  );
}

async function ProfileIdentityPanel() {
  if (await isDemoSession()) {
    return (
      <SettingsDemoBlock description="Taille, âge et sommeil touchent un compte réel. Désactivés sur le compte démo partagé." />
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

async function PrivacyPanelWithData() {
  if (await isDemoSession()) {
    return (
      <SettingsDemoBlock description="Les consentements et la suppression de compte concernent un compte réel. Désactivés sur la démo partagée." />
    );
  }

  const athleteId = await getCurrentAthleteId();
  const row = await getAthleteConsentRow(athleteId);
  const initial = row ? serializeConsentRow(row) : null;

  return <PrivacySettingsPanel initial={initial} compact />;
}

/**
 * Profil = identité & rythme + session + confidentialité (consents / export / delete).
 * Weight / composition stay on Corps.
 */
export default function SettingsAccountPage() {
  return (
    <div className="space-y-6">
      <MobileBackLink fallbackHref={MOI_HUB_PATH} fallbackLabel="Réglages" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Réglages</p>
        <h1 className="text-page-title mt-1">Profil</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Identité, connexion et données personnelles.
        </p>
      </StickyHeader>

      <section aria-labelledby="profil-identite" className="space-y-3" id="identite">
        <div>
          <h2 className="text-section-title" id="profil-identite">
            Identité & rythme
          </h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Attributs stables. Le poids se lit dans Corps.
          </p>
        </div>
        <Suspense fallback={<ProfileIdentityFallback />}>
          <ProfileIdentityPanel />
        </Suspense>
      </section>

      <Suspense fallback={null}>
        <SettingsSignOut />
      </Suspense>

      <section aria-labelledby="profil-privacy" className="space-y-3" id="confidentialite">
        <div>
          <h2 className="text-section-title" id="profil-privacy">
            Confidentialité
          </h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Consentements, export et suppression — {CONTROLLER_EMAIL}.
          </p>
        </div>
        <Suspense fallback={<PrivacySkeleton />}>
          <PrivacyPanelWithData />
        </Suspense>
      </section>
    </div>
  );
}

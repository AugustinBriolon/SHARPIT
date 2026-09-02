import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { PrivacySettingsPanel } from '@/components/privacy/privacy-settings-panel';
import { SettingsDemoBlock } from '@/components/settings/settings-demo-block';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { isDemoSession } from '@/lib/demo/demo-session';
import { CURRENT_PRIVACY_VERSION } from '@/lib/privacy/constants';
import { getAthleteConsentRow } from '@/lib/privacy/consent-store';

function PrivacySkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <Skeleton className="rounded-analysis-lg h-32 w-full border-0" />
      <Skeleton className="rounded-analysis-lg h-48 w-full border-0" />
    </div>
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
  const initial = row
    ? {
        termsAcceptedAt: row.termsAcceptedAt?.toISOString() ?? null,
        privacyAcceptedAt: row.privacyAcceptedAt?.toISOString() ?? null,
        privacyVersion: row.privacyVersion,
        healthDataConsentAt: row.healthDataConsentAt?.toISOString() ?? null,
        aiProcessingConsentAt: row.aiProcessingConsentAt?.toISOString() ?? null,
        unofficialProvidersAckAt: row.unofficialProvidersAckAt?.toISOString() ?? null,
        currentPrivacyVersion: CURRENT_PRIVACY_VERSION,
      }
    : null;

  return <PrivacySettingsPanel initial={initial} />;
}

export default function SettingsPrivacyPage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/moi" label="Moi" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Moi</p>
        <h1 className="text-page-title mt-1">Confidentialité</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Consentements, export et suppression — contact{' '}
          <span className="text-foreground">augustin.briolon@gmail.com</span>.
        </p>
      </StickyHeader>
      <Suspense fallback={<PrivacySkeleton />}>
        <PrivacyPanelWithData />
      </Suspense>
    </div>
  );
}

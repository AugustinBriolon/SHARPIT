import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { athleteNeedsOnboarding } from '@/lib/onboarding/status';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import {
  loadConnectedIntegrationIds,
  loadResolvedSourcePrefs,
} from '@/lib/integrations/source-prefs-store';
import { awaitRequest } from '@/lib/next/await-request';

export const metadata = {
  title: 'Bienvenue — SharpIt',
};

export default function OnboardingPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-center text-sm">Chargement…</p>}>
      <OnboardingPageContent />
    </Suspense>
  );
}

async function OnboardingPageContent() {
  await awaitRequest();
  const athleteId = await getCurrentAthleteId();
  if (!(await athleteNeedsOnboarding(athleteId))) {
    redirect('/');
  }

  const [connected, prefs] = await Promise.all([
    loadConnectedIntegrationIds(athleteId),
    loadResolvedSourcePrefs(athleteId),
  ]);
  return <OnboardingWizard initiallyConnected={connected} initialPrefs={prefs} />;
}

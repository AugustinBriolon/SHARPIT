import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { PerformanceCalibrationPanel } from '@/components/settings/profile/performance-calibration-panel';
import { SettingsDemoBlock } from '@/components/settings/settings-demo-block';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { isDemoSession } from '@/lib/demo/demo-session';
import { mapAthleteProfileToFormData } from '@/lib/profile/map-athlete-profile';
import { getAthleteProfile } from '@/lib/queries';

function CalibrationPanelSkeleton() {
  return <Skeleton className="h-96 w-full rounded-2xl" aria-busy />;
}

async function CalibrationPanelWithProfile() {
  if (await isDemoSession()) {
    return (
      <SettingsDemoBlock description="Tes seuils (FTP, allure, FC) sont des réglages de compte réel. Désactivés sur le compte démo partagé." />
    );
  }

  const athleteId = await getCurrentAthleteId();
  const athleteProfile = await getAthleteProfile(athleteId).catch(() => null);

  return <PerformanceCalibrationPanel initial={mapAthleteProfileToFormData(athleteProfile)} />;
}

/**
 * Thresholds are athlete measurements — also surfaced under Progression →
 * Performance for expert reading (ADR-022 / ADR-023). Settings keeps a direct
 * edit surface so the Profil entry never dead-ends on a redirect.
 */
export default function SettingsCalibrationPage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Profil" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Profil</p>
        <h1 className="text-page-title mt-1">Seuils &amp; repères</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          FTP, allure seuil, FC max — le yardstick contre lequel la charge est lue.
        </p>
      </StickyHeader>

      <Suspense fallback={<CalibrationPanelSkeleton />}>
        <CalibrationPanelWithProfile />
      </Suspense>
    </div>
  );
}

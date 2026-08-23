import { Suspense } from 'react';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import { PerformanceCalibrationPanel } from '@/components/settings/profile/performance-calibration-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { mapAthleteProfileToFormData } from '@/lib/profile/map-athlete-profile';
import { getAthleteProfile } from '@/lib/queries';

/**
 * Thresholds live in Settings because that is what they are.
 *
 * They sat behind Entraînement → Progression → Calibration, three taps into a
 * training hub, while the panel itself has always been a settings panel — it is
 * literally `components/settings/profile/`. Nobody looks for their FTP inside a
 * list of sessions.
 */
async function CalibrationPanelWithProfile() {
  let athleteProfile = null;
  try {
    athleteProfile = await getAthleteProfile();
  } catch (error) {
    console.error('[settings/calibration] getAthleteProfile failed', error);
  }

  return <PerformanceCalibrationPanel initial={mapAthleteProfileToFormData(athleteProfile)} />;
}

export default function SettingsCalibrationPage() {
  return (
    <div className="space-y-4">
      <MobileBackLink href="/settings" label="Profil" showOnDesktop />
      <StickyHeader>
        <p className="text-label">Profil</p>
        <h1 className="text-page-title mt-1">Seuils &amp; repères</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Les repères utilisés pour lire l’intensité, la charge et les écarts à ton niveau réel.
        </p>
      </StickyHeader>

      <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
        <CalibrationPanelWithProfile />
      </Suspense>
    </div>
  );
}

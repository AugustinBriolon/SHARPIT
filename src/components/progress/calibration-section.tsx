'use client';

import { PerformanceCalibrationPanel } from '@/components/settings/profile/performance-calibration-panel';
import { ExpertModeBadge, ExpertOnly } from '@/components/display-mode';
import { Skeleton } from '@/components/ui/skeleton';
import { useAthleteProfile } from '@/hooks/use-data';
import { mapAthleteProfileToFormData } from '@/lib/profile/map-athlete-profile';

/**
 * Client-side calibration for the Progress hub — expert reading only.
 *
 * A threshold is the yardstick the technical metrics are read against; it means
 * nothing to an athlete who was never shown those metrics (ADR-023). Engines
 * still use stored values; Essential athletes simply do not edit them here.
 * Also editable at `/settings/calibration` from Profil.
 *
 * A tabbed hub cannot await inside a section, so the panel is fed from the
 * query cache instead of a server-rendered initial payload.
 */
export function CalibrationSection() {
  const profileQuery = useAthleteProfile();

  if (profileQuery.isPending) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  return (
    <ExpertOnly>
      <div className="mb-3 flex justify-end">
        <ExpertModeBadge />
      </div>
      <PerformanceCalibrationPanel initial={mapAthleteProfileToFormData(profileQuery.data)} />
    </ExpertOnly>
  );
}
